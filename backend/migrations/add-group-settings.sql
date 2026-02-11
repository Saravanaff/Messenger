-- Add settings column to groups table
ALTER TABLE `groups`
ADD COLUMN `settings` JSON DEFAULT (JSON_OBJECT('whoCanCreateRooms', 'everyone', 'whoCanSendMessages', 'everyone', 'whoCanAddMembers', 'admin', 'whoCanRemoveMembers', 'admin'));

-- Update existing groups to have default settings
UPDATE `groups`
SET `settings` = JSON_OBJECT('whoCanCreateRooms', 'everyone', 'whoCanSendMessages', 'everyone', 'whoCanAddMembers', 'admin', 'whoCanRemoveMembers', 'admin')
WHERE `settings` IS NULL;
