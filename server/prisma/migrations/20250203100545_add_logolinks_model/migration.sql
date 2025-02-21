-- CreateTable
CREATE TABLE `ImportantLinks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `LOGOUrl` VARCHAR(191) NOT NULL,
    `linksUrl` VARCHAR(191) NOT NULL,
    `logoName` VARCHAR(191) NOT NULL,
    `logoPosition` INTEGER NOT NULL,
    `created_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NOT NULL,
    `modify_on` DATETIME(3) NULL,
    `modify_by` VARCHAR(191) NULL,
    `publicId` VARCHAR(191) NOT NULL,
    `IsVisible` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
