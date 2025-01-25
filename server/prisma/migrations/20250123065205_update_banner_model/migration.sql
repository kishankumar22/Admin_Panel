-- AlterTable
ALTER TABLE `banner` MODIFY `created_on` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `created_by` VARCHAR(191) NULL,
    MODIFY `modify_on` DATETIME(3) NULL,
    MODIFY `modify_by` VARCHAR(191) NULL;
