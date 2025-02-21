/*
  Warnings:

  - You are about to drop the column `name` on the `faculty` table. All the data in the column will be lost.
  - Added the required column `faculty_name` to the `Faculty` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `faculty` DROP COLUMN `name`,
    ADD COLUMN `faculty_name` VARCHAR(191) NOT NULL;
