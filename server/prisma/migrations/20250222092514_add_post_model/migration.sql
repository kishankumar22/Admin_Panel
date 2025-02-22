-- CreateTable
CREATE TABLE `LatestPost` (
    `post_id` INTEGER NOT NULL AUTO_INCREMENT,
    `post_title` VARCHAR(191) NOT NULL,
    `post_slug` VARCHAR(191) NOT NULL,
    `post_content` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modify_by` VARCHAR(191) NULL,
    `modify_on` DATETIME(3) NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `LatestPost_post_slug_key`(`post_slug`),
    PRIMARY KEY (`post_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
