-- CreateTable
CREATE TABLE "users" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "username" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'uz',
    "phone" TEXT,
    "slices" INTEGER NOT NULL DEFAULT 0,
    "address" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" BIGINT NOT NULL,
    "groupCode" TEXT,
    "items" JSONB NOT NULL,
    "mode" TEXT NOT NULL,
    "address" JSONB,
    "phone" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "payment" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" INTEGER NOT NULL,
    "deliveryFee" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "slicesUsed" INTEGER NOT NULL DEFAULT 0,
    "slicesEarned" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "history" JSONB NOT NULL,
    "distanceKm" REAL,
    "etaAt" DATETIME,
    "adminChatId" TEXT,
    "adminMessageId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "groups" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "hostId" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "orderId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "group_members" (
    "groupCode" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("groupCode", "userId"),
    CONSTRAINT "group_members_groupCode_fkey" FOREIGN KEY ("groupCode") REFERENCES "groups" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "group_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "groupCode" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "config" JSONB NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_items_groupCode_fkey" FOREIGN KEY ("groupCode") REFERENCES "groups" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stoplist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "orders_userId_id_idx" ON "orders"("userId", "id");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "group_members_userId_idx" ON "group_members"("userId");

-- CreateIndex
CREATE INDEX "group_items_groupCode_idx" ON "group_items"("groupCode");

-- Buyurtma raqamlari #1001 dan boshlansin — mijozga chiroyliroq ko'rinadi
INSERT INTO "sqlite_sequence" ("name", "seq") VALUES ('orders', 1000);
