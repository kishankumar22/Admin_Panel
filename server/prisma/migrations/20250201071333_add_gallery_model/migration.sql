-- CreateTable
CREATE TABLE `Gallery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `galleryUrl` VARCHAR(191) NOT NULL,
    `galleryName` VARCHAR(191) NOT NULL,
    `galleryPosition` INTEGER NOT NULL,
    `created_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NOT NULL,
    `modify_on` DATETIME(3) NULL,
    `modify_by` VARCHAR(191) NULL,
    `publicId` VARCHAR(191) NOT NULL,
    `IsVisible` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
