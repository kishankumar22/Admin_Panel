/*
  Warnings:

  - Added the required column `bannerPosition` to the `Banner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `banner` ADD COLUMN `bannerPosition` INTEGER NOT NULL;
