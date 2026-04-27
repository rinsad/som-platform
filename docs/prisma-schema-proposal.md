# Prisma Schema Proposal

This is a proposal only. No `schema.prisma` has been implemented yet.

The simulator should model virtual training activity, not real brokerage operations. The schema below avoids real payment gateways, real bank accounts, market connectivity, regulatory suitability workflows, and clearing or settlement concepts.

## Design Goals

- Keep roles simple for V1: `TRADER` and `ADMIN`.
- Keep all cash and trade activity explicitly simulated.
- Support instructor-created scenarios and assignments.
- Preserve auditability for training actions without implying regulated brokerage records.
- Use decimal types for virtual money and prices.

## Proposed Prisma Models

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  TRADER
  ADMIN
}

enum AccountStatus {
  ACTIVE
  SUSPENDED
  ARCHIVED
}

enum CashTransactionType {
  DEPOSIT
  WITHDRAWAL
}

enum CashTransactionStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum OrderSide {
  BUY
  SELL
}

enum OrderType {
  MARKET
  LIMIT
}

enum OrderStatus {
  DRAFT
  SUBMITTED
  FILLED
  PARTIALLY_FILLED
  REJECTED
  CANCELLED
}

enum ScenarioStatus {
  DRAFT
  READY
  ARCHIVED
}

enum AssignmentStatus {
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  role         Role     @default(TRADER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  accounts            TrainingAccount[]
  scenarioAssignments ScenarioAssignment[] @relation("AssignedTrader")
  createdScenarios    Scenario[]           @relation("ScenarioCreator")
  adminAssignments    ScenarioAssignment[] @relation("AssignedByAdmin")
  auditLogs           AuditLog[]
}

model TrainingAccount {
  id           String        @id @default(cuid())
  userId       String
  label        String
  currency     String        @default("USD")
  cashBalance  Decimal       @db.Decimal(18, 2)
  status       AccountStatus @default(ACTIVE)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  user             User                 @relation(fields: [userId], references: [id])
  positions        Position[]
  cashTransactions CashTransaction[]
  orders           TradeOrder[]
  assignments      ScenarioAssignment[]

  @@index([userId])
}

model Instrument {
  id          String   @id @default(cuid())
  symbol      String   @unique
  name        String
  assetClass  String   @default("EQUITY")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  positions Position[]
  orders    TradeOrder[]
}

model Position {
  id          String   @id @default(cuid())
  accountId   String
  instrumentId String
  quantity    Decimal  @db.Decimal(18, 6)
  averageCost Decimal  @db.Decimal(18, 4)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  account    TrainingAccount @relation(fields: [accountId], references: [id])
  instrument Instrument      @relation(fields: [instrumentId], references: [id])

  @@unique([accountId, instrumentId])
}

model CashTransaction {
  id          String                @id @default(cuid())
  accountId   String
  type        CashTransactionType
  status      CashTransactionStatus @default(PENDING)
  amount      Decimal               @db.Decimal(18, 2)
  note        String?
  reviewedBy  String?
  reviewedAt  DateTime?
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  account TrainingAccount @relation(fields: [accountId], references: [id])

  @@index([accountId, status])
}

model TradeOrder {
  id           String      @id @default(cuid())
  accountId    String
  instrumentId String
  scenarioId   String?
  side         OrderSide
  orderType    OrderType
  status       OrderStatus @default(DRAFT)
  quantity     Decimal     @db.Decimal(18, 6)
  limitPrice   Decimal?    @db.Decimal(18, 4)
  simulatedFillPrice Decimal? @db.Decimal(18, 4)
  submittedAt  DateTime?
  filledAt     DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  account    TrainingAccount @relation(fields: [accountId], references: [id])
  instrument Instrument      @relation(fields: [instrumentId], references: [id])
  scenario   Scenario?       @relation(fields: [scenarioId], references: [id])

  @@index([accountId, status])
  @@index([scenarioId])
}

model Scenario {
  id             String         @id @default(cuid())
  createdById    String
  name           String
  description    String
  objective      String
  status         ScenarioStatus @default(DRAFT)
  startingCash   Decimal        @db.Decimal(18, 2)
  rules          Json
  marketTimeline Json?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  createdBy   User                 @relation("ScenarioCreator", fields: [createdById], references: [id])
  assignments ScenarioAssignment[]
  orders      TradeOrder[]

  @@index([status])
}

model ScenarioAssignment {
  id          String           @id @default(cuid())
  scenarioId  String
  traderId    String
  accountId   String
  assignedById String
  status      AssignmentStatus @default(ASSIGNED)
  dueAt       DateTime?
  startedAt   DateTime?
  completedAt DateTime?
  notes       String?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  scenario   Scenario        @relation(fields: [scenarioId], references: [id])
  trader     User            @relation("AssignedTrader", fields: [traderId], references: [id])
  account    TrainingAccount @relation(fields: [accountId], references: [id])
  assignedBy User            @relation("AssignedByAdmin", fields: [assignedById], references: [id])

  @@index([traderId, status])
  @@index([scenarioId])
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  action     String
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())

  actor User? @relation(fields: [actorId], references: [id])

  @@index([entityType, entityId])
  @@index([actorId])
}
```

## Open Decisions Before Implementation

- Whether admins can also have trader accounts for demos, or whether admin trading access should be separate.
- Whether scenario `rules` should stay flexible as JSON for V1 or become normalized once rule types stabilize.
- Whether simulated fills should be stored only on `TradeOrder` for V1 or split into a separate `TradeFill` model for partial fill detail.
- Whether password auth will remain first-party or move behind an identity provider later.
