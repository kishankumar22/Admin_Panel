/*
  Warnings:

  - Added the required column `notification_url` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `notification` ADD COLUMN `notification_url` VARCHAR(191) NOT NULL;
