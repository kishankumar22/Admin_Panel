/*
  Warnings:

  - You are about to drop the `permission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `permission` DROP FOREIGN KEY `Permission_roleId_fkey`;

-- DropTable
DROP TABLE `permission`;

-- CreateTable
CREATE TABLE `Page` (
    `pageId` INTEGER NOT NULL AUTO_INCREMENT,
    `pageName` VARCHAR(191) NOT NULL,
    `pageUrl` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `created_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modify_by` VARCHAR(191) NULL,
    `modify_on` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Page_pageUrl_key`(`pageUrl`),
    PRIMARY KEY (`pageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
