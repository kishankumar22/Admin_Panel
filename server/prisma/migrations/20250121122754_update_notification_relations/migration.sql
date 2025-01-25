/*
  Warnings:

  - You are about to drop the column `createdAt` on the `notification` table. All the data in the column will be lost.
  - Added the required column `created_by` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `notification` DROP COLUMN `createdAt`,
    ADD COLUMN `created_by` VARCHAR(191) NOT NULL,
    ADD COLUMN `created_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `modify_by` VARCHAR(191) NULL,
    ADD COLUMN `modify_on` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `created_by` VARCHAR(191) NOT NULL,
    ADD COLUMN `created_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `modify_by` VARCHAR(191) NULL,
    ADD COLUMN `modify_on` DATETIME(3) NULL;
