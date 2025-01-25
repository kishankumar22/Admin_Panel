/*
  Warnings:

  - Made the column `created_on` on table `banner` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_by` on table `banner` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `banner` MODIFY `created_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `created_by` VARCHAR(191) NOT NULL;
