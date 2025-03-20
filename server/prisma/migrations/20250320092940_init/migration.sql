BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [role_id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([role_id]),
    CONSTRAINT [Role_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [user_id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [mobileNo] NVARCHAR(15) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [roleId] INT NOT NULL,
    [created_on] DATETIME2,
    [created_by] NVARCHAR(1000),
    [modify_on] DATETIME2,
    [modify_by] NVARCHAR(1000),
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([user_id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Notification] (
    [notification_id] INT NOT NULL IDENTITY(1,1),
    [notification_message] NVARCHAR(225) NOT NULL,
    [notification_url] NVARCHAR(1000) NOT NULL,
    [public_id] NVARCHAR(1000),
    [userId] INT NOT NULL,
    [created_on] DATETIME2 NOT NULL CONSTRAINT [Notification_created_on_df] DEFAULT CURRENT_TIMESTAMP,
    [created_by] NVARCHAR(1000) NOT NULL,
    [modify_by] NVARCHAR(1000),
    [modify_on] DATETIME2,
    CONSTRAINT [Notification_pkey] PRIMARY KEY CLUSTERED ([notification_id])
);

-- CreateTable
CREATE TABLE [dbo].[Banner] (
    [id] INT NOT NULL IDENTITY(1,1),
    [bannerUrl] NVARCHAR(1000) NOT NULL,
    [bannerName] NVARCHAR(1000) NOT NULL,
    [bannerPosition] INT NOT NULL,
    [created_on] DATETIME2 NOT NULL CONSTRAINT [Banner_created_on_df] DEFAULT CURRENT_TIMESTAMP,
    [created_by] NVARCHAR(1000) NOT NULL,
    [modify_on] DATETIME2,
    [modify_by] NVARCHAR(1000),
    [publicId] NVARCHAR(1000) NOT NULL,
    [IsVisible] BIT NOT NULL CONSTRAINT [Banner_IsVisible_df] DEFAULT 1,
    CONSTRAINT [Banner_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Gallery] (
    [id] INT NOT NULL IDENTITY(1,1),
    [galleryUrl] NVARCHAR(1000) NOT NULL,
    [galleryName] NVARCHAR(1000) NOT NULL,
    [galleryPosition] INT NOT NULL,
    [created_on] DATETIME2 NOT NULL CONSTRAINT [Gallery_created_on_df] DEFAULT CURRENT_TIMESTAMP,
    [created_by] NVARCHAR(1000) NOT NULL,
    [modify_on] DATETIME2,
    [modify_by] NVARCHAR(1000),
    [publicId] NVARCHAR(1000) NOT NULL,
    [IsVisible] BIT NOT NULL CONSTRAINT [Gallery_IsVisible_df] DEFAULT 1,
    CONSTRAINT [Gallery_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ImportantLinks] (
    [id] INT NOT NULL IDENTITY(1,1),
    [LOGOUrl] NVARCHAR(1000) NOT NULL,
    [linksUrl] NVARCHAR(1000) NOT NULL,
    [logoName] NVARCHAR(1000) NOT NULL,
    [logoPosition] INT NOT NULL,
    [created_on] DATETIME2 NOT NULL CONSTRAINT [ImportantLinks_created_on_df] DEFAULT CURRENT_TIMESTAMP,
    [created_by] NVARCHAR(1000) NOT NULL,
    [modify_on] DATETIME2,
    [modify_by] NVARCHAR(1000),
    [publicId] NVARCHAR(1000) NOT NULL,
    [IsVisible] BIT NOT NULL CONSTRAINT [ImportantLinks_IsVisible_df] DEFAULT 1,
    CONSTRAINT [ImportantLinks_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Faculty] (
    [id] INT NOT NULL IDENTITY(1,1),
    [faculty_name] NVARCHAR(1000) NOT NULL,
    [qualification] NVARCHAR(1000) NOT NULL,
    [designation] NVARCHAR(1000) NOT NULL,
    [profilePicUrl] NVARCHAR(1000),
    [created_on] DATETIME2 NOT NULL CONSTRAINT [Faculty_created_on_df] DEFAULT CURRENT_TIMESTAMP,
    [created_by] NVARCHAR(1000) NOT NULL,
    [modify_on] DATETIME2,
    [modify_by] NVARCHAR(1000),
    [IsVisible] BIT NOT NULL CONSTRAINT [Faculty_IsVisible_df] DEFAULT 1,
    CONSTRAINT [Faculty_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LatestPost] (
    [post_id] INT NOT NULL IDENTITY(1,1),
    [post_title] NVARCHAR(1000) NOT NULL,
    [post_slug] NVARCHAR(1000) NOT NULL,
    [post_content] NVARCHAR(max) NOT NULL,
    [created_by] NVARCHAR(1000) NOT NULL,
    [created_on] DATETIME2 NOT NULL CONSTRAINT [LatestPost_created_on_df] DEFAULT CURRENT_TIMESTAMP,
    [modify_by] NVARCHAR(1000),
    [modify_on] DATETIME2,
    [isVisible] BIT NOT NULL CONSTRAINT [LatestPost_isVisible_df] DEFAULT 1,
    CONSTRAINT [LatestPost_pkey] PRIMARY KEY CLUSTERED ([post_id]),
    CONSTRAINT [LatestPost_post_slug_key] UNIQUE NONCLUSTERED ([post_slug])
);

-- CreateTable
CREATE TABLE [dbo].[Page] (
    [pageId] INT NOT NULL IDENTITY(1,1),
    [pageName] NVARCHAR(1000) NOT NULL,
    [pageUrl] NVARCHAR(1000) NOT NULL,
    [created_by] NVARCHAR(1000),
    [created_on] DATETIME2 NOT NULL CONSTRAINT [Page_created_on_df] DEFAULT CURRENT_TIMESTAMP,
    [modify_by] NVARCHAR(1000),
    [modify_on] DATETIME2,
    CONSTRAINT [Page_pkey] PRIMARY KEY CLUSTERED ([pageId]),
    CONSTRAINT [Page_pageUrl_key] UNIQUE NONCLUSTERED ([pageUrl])
);

-- CreateTable
CREATE TABLE [dbo].[Permission] (
    [permissionId] INT NOT NULL IDENTITY(1,1),
    [roleId] INT NOT NULL,
    [pageId] INT NOT NULL,
    [canCreate] BIT NOT NULL CONSTRAINT [Permission_canCreate_df] DEFAULT 0,
    [canRead] BIT NOT NULL CONSTRAINT [Permission_canRead_df] DEFAULT 0,
    [canUpdate] BIT NOT NULL CONSTRAINT [Permission_canUpdate_df] DEFAULT 0,
    [canDelete] BIT NOT NULL CONSTRAINT [Permission_canDelete_df] DEFAULT 0,
    [created_by] NVARCHAR(1000),
    [created_on] DATETIME2 NOT NULL CONSTRAINT [Permission_created_on_df] DEFAULT CURRENT_TIMESTAMP,
    [modify_by] NVARCHAR(1000),
    [modify_on] DATETIME2,
    CONSTRAINT [Permission_pkey] PRIMARY KEY CLUSTERED ([permissionId]),
    CONSTRAINT [Permission_roleId_pageId_key] UNIQUE NONCLUSTERED ([roleId],[pageId])
);

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([role_id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([user_id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Permission] ADD CONSTRAINT [Permission_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([role_id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Permission] ADD CONSTRAINT [Permission_pageId_fkey] FOREIGN KEY ([pageId]) REFERENCES [dbo].[Page]([pageId]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
