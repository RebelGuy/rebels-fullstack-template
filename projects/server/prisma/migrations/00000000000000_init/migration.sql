-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(32) NOT NULL,
    `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hashedPassword` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `user_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(8) NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `login_token_userId_fkey`(`userId`),
    UNIQUE INDEX `login_token_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rank` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` ENUM('admin') NOT NULL,
    `description` VARCHAR(1024) NULL,

    UNIQUE INDEX `rank_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_rank` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `issuedAt` DATETIME(3) NOT NULL,
    `expirationTime` DATETIME(3) NULL,
    `message` VARCHAR(1024) NULL,
    `revokedTime` DATETIME(3) NULL,
    `revokeMessage` VARCHAR(1024) NULL,
    `rankId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `assignedByUserId` INTEGER NULL,
    `revokedByUserId` INTEGER NULL,

    INDEX `user_rank_rankId_fkey`(`rankId`),
    INDEX `user_rank_userId_fkey`(`userId`),
    INDEX `user_rank_expirationTime_key`(`expirationTime`),
    INDEX `user_rank_revokedTime_key`(`revokedTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskType` VARCHAR(63) NOT NULL,
    `intervalMs` INTEGER NOT NULL,

    UNIQUE INDEX `task_taskType_key`(`taskType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NULL,
    `log` VARCHAR(4096) NULL,
    `errorMessage` VARCHAR(4096) NULL,
    `taskId` INTEGER NOT NULL,

    INDEX `task_log_taskId_fkey`(`taskId`),
    INDEX `task_log_startTime_key`(`startTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `login_token` ADD CONSTRAINT `login_token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_rank` ADD CONSTRAINT `user_rank_rankId_fkey` FOREIGN KEY (`rankId`) REFERENCES `rank`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_rank` ADD CONSTRAINT `user_rank_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_rank` ADD CONSTRAINT `user_rank_assignedByUserId_fkey` FOREIGN KEY (`assignedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_rank` ADD CONSTRAINT `user_rank_revokedByUserId_fkey` FOREIGN KEY (`revokedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_log` ADD CONSTRAINT `task_log_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add Trigger to prevent two ranks of the same type being active simultaneously for the same user
CREATE DEFINER = CURRENT_USER TRIGGER `TRG_CHECK_EXISTING_ACTIVE_RANK` BEFORE INSERT ON user_rank
FOR EACH ROW

BEGIN
  IF EXISTS (
    SELECT *
    FROM user_rank
    WHERE rankId = NEW.rankId
    AND userId = NEW.userId
    AND revokedTime IS NULL -- we don't compare revoke times, this essentially acts as a "deactivated" field
    AND (
      expirationTime IS NOT NULL AND expirationTime > NEW.issuedAt
      OR expirationTime IS NULL
    )
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_RANK';
  END IF;
END;