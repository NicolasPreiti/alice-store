# ENTITIES

## User
- id, name, email (unique), passwordHash
- role: `ADMIN | EMPLOYEE`
- isActive, createdAt

## Category
- id, name (unique)

## Product
- id, name, sku (unique)
- cost (Decimal), price (Decimal)
- description (String?, nullable)
- stock (Int)
- categoryId → Category
- isActive, createdAt, updatedAt

## Client
- id, name
- phone (String?, optional)
- notes (String?, optional)
- createdAt

## Sale
- id, number (sequential)
- userId → User
- clientId? → Client (optional)
- total (Decimal)
- createdAt

## SaleItem (snapshot)
- id, saleId → Sale
- productId → Product
- productName, productCost, productPrice (snapshots at sale time)
- quantity (Int)
- subtotal (Decimal)

## SalePayment
- id, saleId → Sale
- method: `CASH | MERCADO_PAGO`
- amount (Decimal)
- createdAt

## Debt
- id
- clientId → Client
- saleId? → Sale (null = manual debt)
- amount (Decimal)
- paid (Decimal, default 0)
- status: `OPEN | PARTIAL | PAID`
- createdAt

## Payment (against a debt)
- id, debtId → Debt
- amount (Decimal)
- method: `CASH | MERCADO_PAGO`
- createdAt

## Rules
1. Create sale → one transaction: Sale + SaleItems (snapshots) + decrement Product.stock.
2. SalePayments sum ≤ Sale.total; remainder > 0 → auto-create Debt (saleId set).
3. Credit sale = payments don't cover the total; no special flag.
4. Multiple SalePayments per sale (e.g. $60 CASH + $40 MERCADO_PAGO).
5. Each Payment updates Debt.paid; status: `OPEN` (paid = 0), `PARTIAL` (0 < paid < amount), `PAID` (paid ≥ amount).
6. Manual debts allowed (saleId = null).
7. Roles: `ADMIN` = everything + user management; `EMPLOYEE` = sales, products, clients, debts.
