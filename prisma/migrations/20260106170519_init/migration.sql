-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(14) NOT NULL,
    `deviceId` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_cpf_key`(`cpf`),
    UNIQUE INDEX `User_deviceId_key`(`deviceId`),
    INDEX `User_cpf_idx`(`cpf`),
    INDEX `User_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Historico` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('ENTRY', 'BREAK_START', 'BREAK_END', 'EXIT') NOT NULL,
    `dataHora` DATETIME(0) NOT NULL,
    `protocolo` VARCHAR(64) NOT NULL,
    `hashSha256` CHAR(64) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `deviceId` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Historico_protocolo_key`(`protocolo`),
    INDEX `Historico_userId_dataHora_idx`(`userId`, `dataHora`),
    INDEX `Historico_protocolo_idx`(`protocolo`),
    INDEX `Historico_hashSha256_idx`(`hashSha256`),
    UNIQUE INDEX `Historico_protocolo_hashSha256_key`(`protocolo`, `hashSha256`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Historico` ADD CONSTRAINT `Historico_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
