-- MySQL-compatible schema (mirrors prisma/schema.prisma)
CREATE TABLE IF NOT EXISTS `User` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NULL,
  `email` varchar(191) NOT NULL,
  `passwordHash` varchar(191) NOT NULL,
  `role` ENUM('ADMIN','TOURNAMENT_ADMIN') NOT NULL DEFAULT 'TOURNAMENT_ADMIN',
  `emailVerified` datetime(3) NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
);

CREATE TABLE IF NOT EXISTS `Account` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `provider` varchar(191) NOT NULL,
  `providerAccountId` varchar(191) NOT NULL,
  `refresh_token` varchar(191) NULL,
  `access_token` varchar(191) NULL,
  `expires_at` int NULL,
  `token_type` varchar(191) NULL,
  `scope` varchar(191) NULL,
  `id_token` text NULL,
  `session_state` varchar(191) NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Account_provider_providerAccountId_key` (`provider`, `providerAccountId`),
  CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `Session` (
  `id` varchar(191) NOT NULL,
  `sessionToken` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `expires` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Session_sessionToken_key` (`sessionToken`),
  CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `VerificationToken` (
  `identifier` varchar(191) NOT NULL,
  `token` varchar(191) NOT NULL,
  `expires` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  UNIQUE KEY `VerificationToken_token_key` (`token`),
  UNIQUE KEY `VerificationToken_identifier_token_key` (`identifier`, `token`)
);

CREATE TABLE IF NOT EXISTS `Sport` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Sport_name_key` (`name`)
);

CREATE TABLE IF NOT EXISTS `Category` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `abbreviation` varchar(191) NOT NULL,
  `sportId` varchar(191) NOT NULL,
  `modality` ENUM('SINGLES','DOUBLES') NULL,
  `gender` ENUM('MALE','FEMALE','MIXED') NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Category_sportId_name_key` (`sportId`, `name`),
  UNIQUE KEY `Category_sportId_abbreviation_key` (`sportId`, `abbreviation`),
  CONSTRAINT `Category_sportId_fkey` FOREIGN KEY (`sportId`) REFERENCES `Sport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `Tournament` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text NULL,
  `sportId` varchar(191) NULL,
  `leagueId` varchar(191) NULL,
  `address` varchar(191) NULL,
  `startDate` datetime(3) NULL,
  `endDate` datetime(3) NULL,
  `registrationDeadline` datetime(3) NULL,
  `rulesText` text NULL,
  `playDays` json NULL,
  `rankingEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `ownerId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `Tournament_sportId_fkey` FOREIGN KEY (`sportId`) REFERENCES `Sport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Tournament_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `League`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Tournament_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `TournamentClub` (
  `id` varchar(191) NOT NULL,
  `tournamentId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `address` varchar(191) NULL,
  `courtsCount` int NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `TournamentClub_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `TournamentCategory` (
  `tournamentId` varchar(191) NOT NULL,
  `categoryId` varchar(191) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `secondaryPrice` decimal(10,2) NOT NULL DEFAULT 0.00,
  `siblingPrice` decimal(10,2) NOT NULL DEFAULT 0.00,
  `drawType` ENUM('ROUND_ROBIN','GROUPS_PLAYOFF','PLAYOFF') NULL,
  `groupMinSize` int NULL,
  `groupMaxSize` int NULL,
  `groupQualifiers` int NOT NULL DEFAULT 2,
  PRIMARY KEY (`tournamentId`, `categoryId`),
  CONSTRAINT `TournamentCategory_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `TournamentCategory` (
  `tournamentId` varchar(191) NOT NULL,
  `categoryId` varchar(191) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `secondaryPrice` decimal(10,2) NOT NULL DEFAULT 0.00,
  `siblingPrice` decimal(10,2) NOT NULL DEFAULT 0.00,
  `drawType` ENUM('ROUND_ROBIN','GROUPS_PLAYOFF','PLAYOFF') NULL,
  `groupMinSize` int NULL,
  `groupMaxSize` int NULL,
  `groupQualifiers` int NOT NULL DEFAULT 2,
  PRIMARY KEY (`tournamentId`, `categoryId`),
  CONSTRAINT `TournamentCategory_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `Player` (
  `id` varchar(191) NOT NULL,
  `documentType` ENUM('ID_CARD','PASSPORT') NOT NULL DEFAULT 'ID_CARD',
  `documentNumber` varchar(191) NOT NULL,
  `firstName` varchar(191) NOT NULL,
  `lastName` varchar(191) NOT NULL,
  `dateOfBirth` datetime(3) NULL,
  `phone` varchar(191) NULL,
  `gender` ENUM('MALE','FEMALE','OTHER','NOT_SPECIFIED') NOT NULL DEFAULT 'NOT_SPECIFIED',
  `city` varchar(191) NULL,
  `country` varchar(191) NULL,
  `photoUrl` varchar(191) NULL,
  `status` ENUM('UNCONFIRMED','CONFIRMED') NOT NULL DEFAULT 'UNCONFIRMED',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Player_documentType_documentNumber_key` (`documentType`, `documentNumber`)
);

CREATE TABLE IF NOT EXISTS `TournamentRegistration` (
  `id` varchar(191) NOT NULL,
  `tournamentId` varchar(191) NOT NULL,
  `categoryId` varchar(191) NOT NULL,
  `playerId` varchar(191) NOT NULL,
  `partnerId` varchar(191) NULL,
  `partnerTwoId` varchar(191) NULL,
  `amountPaid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amountDue` decimal(10,2) NULL,
  `seed` int NULL,
  `rankingType` ENUM('LEAGUE','TOURNAMENT') NOT NULL DEFAULT 'LEAGUE',
  `rankingNumber` int NULL,
  `groupName` varchar(191) NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `TournamentRegistration_tournamentId_idx` (`tournamentId`),
  KEY `TournamentRegistration_categoryId_idx` (`categoryId`),
  KEY `TournamentRegistration_playerId_idx` (`playerId`),
  KEY `TournamentRegistration_partnerId_idx` (`partnerId`),
  KEY `TournamentRegistration_partnerTwoId_idx` (`partnerTwoId`),
  CONSTRAINT `TournamentRegistration_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentRegistration_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentRegistration_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentRegistration_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `TournamentRegistration_partnerTwoId_fkey` FOREIGN KEY (`partnerTwoId`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `TournamentMatch` (
  `id` varchar(191) NOT NULL,
  `tournamentId` varchar(191) NOT NULL,
  `categoryId` varchar(191) NOT NULL,
  `groupName` varchar(191) NULL,
  `stage` ENUM('GROUP','PLAYOFF') NOT NULL DEFAULT 'GROUP',
  `winnerSide` ENUM('A','B') NULL,
  `outcomeType` ENUM('PLAYED','WALKOVER','INJURY') NOT NULL DEFAULT 'PLAYED',
  `outcomeSide` ENUM('A','B') NULL,
  `roundNumber` int NULL,
  `scheduledDate` date NULL,
  `startTime` varchar(191) NULL,
  `games` json NULL,
  `teamAId` varchar(191) NOT NULL,
  `teamBId` varchar(191) NOT NULL,
  `clubId` varchar(191) NULL,
  `courtNumber` int NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `TournamentMatch_tournamentId_idx` (`tournamentId`),
  KEY `TournamentMatch_categoryId_idx` (`categoryId`),
  KEY `TournamentMatch_teamAId_idx` (`teamAId`),
  KEY `TournamentMatch_teamBId_idx` (`teamBId`),
  KEY `TournamentMatch_clubId_idx` (`clubId`),
  CONSTRAINT `TournamentMatch_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentMatch_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentMatch_teamAId_fkey` FOREIGN KEY (`teamAId`) REFERENCES `TournamentRegistration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentMatch_teamBId_fkey` FOREIGN KEY (`teamBId`) REFERENCES `TournamentRegistration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentMatch_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `TournamentClub`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `TournamentGroupQualifier` (
  `id` varchar(191) NOT NULL,
  `tournamentId` varchar(191) NOT NULL,
  `categoryId` varchar(191) NOT NULL,
  `groupName` varchar(191) NOT NULL,
  `qualifiers` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TournamentGroupQualifier_tournamentId_categoryId_groupName_key` (`tournamentId`, `categoryId`, `groupName`),
  KEY `TournamentGroupQualifier_tournamentId_idx` (`tournamentId`),
  KEY `TournamentGroupQualifier_categoryId_idx` (`categoryId`),
  CONSTRAINT `TournamentGroupQualifier_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentGroupQualifier_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `TournamentPrize` (
  `id` varchar(191) NOT NULL,
  `tournamentId` varchar(191) NOT NULL,
  `categoryId` varchar(191) NOT NULL,
  `placeFrom` int NOT NULL,
  `placeTo` int NULL,
  `amount` decimal(10,2) NULL,
  `prizeText` varchar(191) NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `TournamentPrize_tournamentId_idx` (`tournamentId`),
  KEY `TournamentPrize_categoryId_idx` (`categoryId`),
  CONSTRAINT `TournamentPrize_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentPrize_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `TournamentRankingPoints` (
  `id` varchar(191) NOT NULL,
  `tournamentId` varchar(191) NOT NULL,
  `placeFrom` int NOT NULL,
  `placeTo` int NULL,
  `points` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `TournamentRankingPoints_tournamentId_idx` (`tournamentId`),
  CONSTRAINT `TournamentRankingPoints_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `TournamentGroupPoints` (
  `id` varchar(191) NOT NULL,
  `tournamentId` varchar(191) NOT NULL,
  `winPoints` int NOT NULL DEFAULT 0,
  `winWithoutGameLossPoints` int NOT NULL DEFAULT 0,
  `lossPoints` int NOT NULL DEFAULT 0,
  `lossWithGameWinPoints` int NOT NULL DEFAULT 0,
  `tiebreakerOrder` json NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TournamentGroupPoints_tournamentId_key` (`tournamentId`),
  KEY `TournamentGroupPoints_tournamentId_idx` (`tournamentId`),
  CONSTRAINT `TournamentGroupPoints_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `TournamentScheduleDay` (
  `id` varchar(191) NOT NULL,
  `tournamentId` varchar(191) NOT NULL,
  `date` date NOT NULL,
  `startTime` varchar(191) NOT NULL,
  `endTime` varchar(191) NOT NULL,
  `matchDurationMinutes` int NOT NULL,
  `breakMinutes` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TournamentScheduleDay_tournamentId_date_key` (`tournamentId`, `date`),
  KEY `TournamentScheduleDay_tournamentId_idx` (`tournamentId`),
  CONSTRAINT `TournamentScheduleDay_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `League` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text NULL,
  `photoUrl` varchar(191) NULL,
  `ownerId` varchar(191) NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `League_name_key` (`name`),
  KEY `League_ownerId_idx` (`ownerId`),
  CONSTRAINT `League_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `Season` (
  `id` varchar(191) NOT NULL,
  `leagueId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Season_leagueId_name_key` (`leagueId`, `name`),
  CONSTRAINT `Season_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `League`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `Sport` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Sport_name_key` (`name`)
);

CREATE TABLE IF NOT EXISTS `Tournament` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text NULL,
  `sportId` varchar(191) NULL,
  `leagueId` varchar(191) NULL,
  `address` varchar(191) NULL,
  `startDate` datetime(3) NULL,
  `endDate` datetime(3) NULL,
  `registrationDeadline` datetime(3) NULL,
  `rulesText` text NULL,
  `playDays` json NULL,
  `rankingEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `ownerId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `Tournament_sportId_fkey` FOREIGN KEY (`sportId`) REFERENCES `Sport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Tournament_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `League`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Tournament_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `TournamentClub` (
  `id` varchar(191) NOT NULL,
  `tournamentId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `address` varchar(191) NULL,
  `courtsCount` int NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `TournamentClub_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
