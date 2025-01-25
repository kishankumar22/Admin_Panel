/*
  Warnings:

  - You are about to drop the column `created_by` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `created_on` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `modify_by` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `modify_on` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `created_by`,
    DROP COLUMN `created_on`,
    DROP COLUMN `modify_by`,
    DROP COLUMN `modify_on`;
