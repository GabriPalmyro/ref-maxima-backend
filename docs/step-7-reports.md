## STEP 7 — Report Module (Generate 3 Reports)

### Prompt builders

Create 3 files in `src/report/prompts/`. Each exports a function `buildPrompt(answers: Record<string, string>): { system: string, user: string }`.

**`persona-icp.prompt.ts`**:
- System prompt: the full "Cliente dos Sonhos" prompt (I'll provide it later — for now use a placeholder string: `"You are a premium positioning strategist. Generate a complete DREAM CLIENT document based on the answers below. Return the full document in markdown format."`)
- User prompt: injects `answers.publico`, `answers.problema`, `answers.transformacao`, `answers.autoridade`, `answers.pilares`
- Format: `1. Target audience: ${answers.publico}\n2. Main problem: ${answers.problema}\n...`

**`posicionamento.prompt.ts`**:
- System: placeholder `"You are a positioning strategist. Generate a complete POSITIONING document. Return in markdown format."`
- User: injects 5 answer keys (placeholder for now, same pattern)

**`mensagem-clara.prompt.ts`**:
- System: `"You are a messaging strategist. Generate a CLEAR MESSAGE document. IMPORTANT: Also return a JSON block at the end of your response with this exact structure, wrapped in \`\`\`json code fence: { \"cards\": [{ \"type\": \"DESEJO\", \"title\": \"Desejo\", \"subtitle\": \"...\", \"bodyText\": \"...\", \"bulletPoints\": [\"...\"] }, ...] } The cards array must have exactly 7 items with types: DESEJO, PROBLEMA, GUIA, PLANO, CONVITE, SUCESSO, FRACASSO in that order."`
- User: injects 5 answer keys

### Report service

**`report/dto/generate-report.dto.ts`**:
- type: @IsEnum(ReportType)
- answers: @IsObject — Record<string, string>

**`report.service.ts`**:

Method `generateReport(menteeId, dto)`:
1. Check if report of this type already exists for mentee → if COMPLETED, throw ConflictException. If ERROR, delete old one to allow retry.
2. Select prompt builder based on `dto.type`:
   - PERSONA_ICP → personaIcpPrompt
   - POSICIONAMENTO → posicionamentoPrompt
   - MENSAGEM_CLARA → mensagemClaraPrompt
3. Build prompts: `const { system, user } = buildPrompt(dto.answers)`
4. Create GeneratedReport with status PROCESSING, save answers snapshot
5. Call `aiService.generateCompletion(system, user)`
6. Save rawResponse and modelUsed
7. For MENSAGEM_CLARA: parse the JSON block from the response:
   - Extract content between \`\`\`json and \`\`\` fences
   - JSON.parse it
   - Create 7 MessageCard records from the cards array
   - Map card types to sortOrder: DESEJO=1, PROBLEMA=2, GUIA=3, PLANO=4, CONVITE=5, SUCESSO=6, FRACASSO=7
8. Update report status to COMPLETED
9. Update mentee onboardingStatus:
   - After PERSONA_ICP → PHASE_1
   - After POSICIONAMENTO → PHASE_2
   - After MENSAGEM_CLARA → COMPLETED
10. Return the full report with messageCards if applicable

Wrap steps 5-9 in try/catch. On error: update report status to ERROR, save errorMessage.

Method `getReports(menteeId)`: findMany where menteeId, order by generatedAt asc

Method `getReport(menteeId, reportId)`: findFirst where id AND menteeId, include messageCards ordered by sortOrder

**`report.controller.ts`**: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('mentee')`

```
POST /reports/generate  → generateReport (body: GenerateReportDto)
GET  /reports           → getReports
GET  /reports/:id       → getReport
```

The POST is synchronous — it waits for the AI response and returns the complete report. No queue needed.

Register ReportModule in AppModule. Import AiModule.
