## STEP 8 — Message Card Module (Read Only)

Cards are created by ReportService in Step 7. This module only reads them.

**`message-card.module.ts`**: imports PrismaModule, providers: MessageCardService, controllers: MessageCardController

**`message-card.service.ts`**:

- `getCards(menteeId)`:
  - Find all MessageCards where menteeId, ordered by sortOrder asc
  - If none found, return empty array
  - Return cards array

**`message-card.controller.ts`**: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('mentee')`

```
GET /message-cards → getCards
```

Register MessageCardModule in AppModule.
