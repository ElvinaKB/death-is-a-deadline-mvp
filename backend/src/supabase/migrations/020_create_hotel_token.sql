-- Migration: 020_create_hotel_invite_tokens

CREATE TABLE "HotelInviteToken" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelInviteToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelInviteToken_email_key" ON "HotelInviteToken"("email");
CREATE UNIQUE INDEX "HotelInviteToken_token_key" ON "HotelInviteToken"("token");