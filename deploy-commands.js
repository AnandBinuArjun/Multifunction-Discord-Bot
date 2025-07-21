const { REST, Routes, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: 'setup-application',
        description: 'Sets up the application message and button.',
        default_member_permissions: String(PermissionFlagsBits.Administrator),
    },
    {
        name: 'server-panel',
        description: 'Sets up the server status control panel.',
        default_member_permissions: String(PermissionFlagsBits.Administrator),
    },
    {
        name: 'setup-ticket-panel',
        description: 'Sets up the ticket creation panel.',
        default_member_permissions: String(PermissionFlagsBits.Administrator),
    },
    {
        name: 'add-role',
        description: 'Temporarily adds a role to a user.',
        default_member_permissions: String(PermissionFlagsBits.ManageRoles),
        options: [
            { name: 'user', type: 6, description: 'The user to give the role to', required: true },
            { name: 'role', type: 8, description: 'The role to add', required: true },
            { name: 'duration', type: 3, description: 'Duration (e.g., 7d, 24h, 60m)', required: true },
            { name: 'reason', type: 3, description: 'The reason for adding the role', required: true },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        // Replace YOUR_CLIENT_ID_HERE with your bot's Client ID from the Discord Developer Portal
        await rest.put(Routes.applicationCommands('YOUR_CLIENT_ID_HERE'), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();