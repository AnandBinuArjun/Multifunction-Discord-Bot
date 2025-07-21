// =================================
//      IMPORTS AND SETUP
// =================================
const {
    Client, GatewayIntentBits, Partials, EmbedBuilder, Collection, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType,
} = require('discord.js');
const ms = require('ms');
const config = require('./config.json');
require('dotenv').config();
const db = require('./database.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
});

const activeApplications = new Collection();
const openTickets = new Collection();

// =================================
//      BOT STARTUP
// =================================
client.once('ready', () => {
    console.log(`🟢 Bot is online! Logged in as ${client.user.tag}`);
    checkAndScheduleRoleRemovals();
});

// =================================
//      EVENT ROUTERS
// =================================
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) await handleSlashCommand(interaction);
    else if (interaction.isButton()) await handleButtonInteraction(interaction);
    else if (interaction.isModalSubmit()) await handleModalSubmit(interaction);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState);
});

// =================================
//      INTERACTION HANDLERS
// =================================
async function handleSlashCommand(interaction) {
    if (!interaction.inGuild()) return;
    switch (interaction.commandName) {
        case 'setup-application': await handleSetupCommand(interaction, 'application'); break;
        case 'server-panel': await handleSetupCommand(interaction, 'server'); break;
        case 'setup-ticket-panel': await handleSetupCommand(interaction, 'ticket'); break;
        case 'add-role': await handleAddRoleCommand(interaction); break;
    }
}

async function handleButtonInteraction(interaction) {
    const { customId } = interaction;
    if (customId === config.applicationSystem.applyButtonId) await handleApplyButton(interaction);
    else if (customId === config.ticketSystem.createTicketButtonId) await handleCreateTicketButton(interaction);
    else if (customId === config.ticketSystem.closeTicketButtonId) await handleCloseTicketButton(interaction);
    else if ([config.serverStatus.onlineButtonId, config.serverStatus.maintenanceButtonId].includes(customId)) await handleSimpleStatusButton(interaction);
    else if (customId === config.serverStatus.restartButtonId) await handleRestartButton(interaction);
}

async function handleModalSubmit(interaction) {
    if (interaction.customId === config.serverStatus.restartModalId) await handleRestartModalSubmit(interaction);
}

// =================================
//      FEATURE LOGIC
// =================================

// --- FEATURE 2: VOICE NOTIFIER ---
function handleVoiceStateUpdate(oldState, newState) {
    const { notificationChannelId, channelsToWatch } = config.voiceNotifier;
    const notificationChannel = newState.guild.channels.cache.get(notificationChannelId);
    if (!notificationChannel || oldState.channelId || !newState.channelId) return;
    if (channelsToWatch.includes(newState.channelId)) {
        const embed = new EmbedBuilder()
            .setColor(config.branding.mainColor)
            .setAuthor({ name: `${newState.member.user.tag} joined a voice channel`, iconURL: newState.member.user.displayAvatarURL() })
            .setDescription(`🎤 They just joined **${newState.channel.name}**! Come say hi!`)
            .setTimestamp()
            .setFooter({ text: config.branding.serverName, iconURL: config.branding.serverIconURL });
        notificationChannel.send({ embeds: [embed] });
    }
}

// --- SETUP COMMANDS (FOR ADMINS) ---
async function handleSetupCommand(interaction, type) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'You do not have permission.', ephemeral: true });
    let embed, button, row;
    switch(type) {
        case 'application':
            embed = new EmbedBuilder().setColor(config.branding.mainColor).setTitle('Server Applications').setDescription('To apply for whitelist, click the button below.');
            button = new ButtonBuilder().setCustomId(config.applicationSystem.applyButtonId).setLabel('Start Application').setStyle(ButtonStyle.Primary).setEmoji('📝');
            row = new ActionRowBuilder().addComponents(button);
            break;
        case 'server':
            embed = new EmbedBuilder().setColor('#2f3136').setTitle('Server Status Control Panel').setDescription('Click a button to post a server status update.');
            const onlineButton = new ButtonBuilder().setCustomId(config.serverStatus.onlineButtonId).setLabel('Online').setStyle(ButtonStyle.Success).setEmoji('✅');
            const restartButton = new ButtonBuilder().setCustomId(config.serverStatus.restartButtonId).setLabel('Restart').setStyle(ButtonStyle.Primary).setEmoji('🔁');
            const maintenanceButton = new ButtonBuilder().setCustomId(config.serverStatus.maintenanceButtonId).setLabel('Maintenance').setStyle(ButtonStyle.Danger).setEmoji('🛠️');
            row = new ActionRowBuilder().addComponents(onlineButton, restartButton, maintenanceButton);
            break;
        case 'ticket':
            embed = new EmbedBuilder().setColor(config.branding.mainColor).setTitle('Create a Support Ticket').setDescription('Need help? Click the button below to open a private ticket.').setImage(config.ticketSystem.panelImageURL);
            button = new ButtonBuilder().setCustomId(config.ticketSystem.createTicketButtonId).setLabel('Create Ticket').setStyle(ButtonStyle.Secondary).setEmoji('🎟️');
            row = new ActionRowBuilder().addComponents(button);
            break;
    }
    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `${type} panel has been set up!`, ephemeral: true });
}

// --- FEATURE 5: TICKET SYSTEM ---
async function handleCreateTicketButton(interaction) {
    if (openTickets.has(interaction.user.id)) return interaction.reply({ content: `You already have an open ticket! <#${openTickets.get(interaction.user.id)}>`, ephemeral: true });
    const { supportRoleId, ticketCategoryId, logChannelId, closeTicketButtonId } = config.ticketSystem;
    const supportRole = interaction.guild.roles.cache.get(supportRoleId);
    if (!supportRole) return interaction.reply({ content: 'Support role is not configured.', ephemeral: true });

    const ticketChannel = await interaction.guild.channels.create({ name: `ticket-${interaction.user.username}`, type: ChannelType.GuildText, parent: ticketCategoryId || null,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ],
    });
    openTickets.set(interaction.user.id, ticketChannel.id);

    const welcomeEmbed = new EmbedBuilder().setColor(config.branding.successColor).setTitle(`Support Ticket for ${interaction.user.username}`).setDescription(`Welcome! Please describe your issue in detail. A member of our <@&${supportRoleId}> team will be with you shortly.`).setThumbnail(interaction.user.displayAvatarURL()).setTimestamp().setFooter({ text: config.branding.serverName, iconURL: config.branding.serverIconURL });
    const closeButton = new ButtonBuilder().setCustomId(closeTicketButtonId).setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒');
    await ticketChannel.send({ content: `${interaction.user} <@&${supportRoleId}>`, embeds: [welcomeEmbed], components: [new ActionRowBuilder().addComponents(closeButton)] });

    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const logEmbed = new EmbedBuilder().setColor(config.branding.mainColor).setTitle('Ticket Created').addFields({ name: 'User', value: interaction.user.tag }, { name: 'Ticket', value: `<#${ticketChannel.id}>` }).setTimestamp().setFooter({ text: 'Ticket Logging System' });
        await logChannel.send({ embeds: [logEmbed] });
    }
    await interaction.reply({ content: `Your ticket has been created! <#${ticketChannel.id}>`, ephemeral: true });
}

async function handleCloseTicketButton(interaction) {
    const { supportRoleId, logChannelId } = config.ticketSystem;
    if (!interaction.member.roles.cache.has(supportRoleId)) return interaction.reply({ content: 'You do not have permission to close tickets.', ephemeral: true });
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.branding.warnColor).setDescription('🔒 Closing this ticket in 5 seconds...')] });
    setTimeout(async () => {
        const userWithOpenTicket = Array.from(openTickets.entries()).find(([_, channelId]) => channelId === interaction.channel.id);
        if (userWithOpenTicket) openTickets.delete(userWithOpenTicket[0]);
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder().setColor(config.branding.errorColor).setTitle('Ticket Closed').addFields({ name: 'Ticket Name', value: interaction.channel.name }, { name: 'Closed By', value: interaction.user.tag }).setTimestamp().setFooter({ text: 'Ticket Logging System' });
            await logChannel.send({ embeds: [logEmbed] });
        }
        await interaction.channel.delete();
    }, 5000);
}


// --- FEATURE 4: PERSISTENT TEMPORARY ROLE ADD ---
async function handleAddRoleCommand(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: 'You do not have permission.', ephemeral: true });
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);
    const role = interaction.options.getRole('role');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason');
    const durationMs = ms(durationStr);
    if (isNaN(durationMs)) return interaction.reply({ content: 'Invalid duration format.', ephemeral: true });
    if (member.roles.cache.has(role.id)) return interaction.reply({ content: 'User already has that role.', ephemeral: true });
    const removeAt = Date.now() + durationMs;
    try {
        await member.roles.add(role);
        db.prepare('INSERT INTO temp_roles (guildId, userId, roleId, removeAt) VALUES (?, ?, ?, ?)').run(interaction.guild.id, user.id, role.id, removeAt);
        scheduleRoleRemoval(interaction.guild.id, user.id, role.id, removeAt);
        const logChannel = client.channels.cache.get(config.roleManagement.logChannelId);
        const logEmbed = new EmbedBuilder().setColor(config.branding.successColor).setTitle('Role Added (Temporary)').addFields({ name: 'User', value: user.tag }, { name: 'Moderator', value: interaction.user.tag }, { name: 'Role', value: role.name }, { name: 'Duration', value: durationStr }, { name: 'Reason', value: reason }).setTimestamp().setFooter({ text: 'Role Management Log' });
        if (logChannel) await logChannel.send({ embeds: [logEmbed] });
        const dmEmbed = new EmbedBuilder().setColor(config.branding.successColor).setTitle('Role Granted').setDescription(`You have been granted the **${role.name}** role in **${interaction.guild.name}**.`).addFields({ name: 'Duration', value: durationStr }, { name: 'Reason', value: reason }).setTimestamp().setFooter({ text: config.branding.serverName, iconURL: config.branding.serverIconURL });
        await user.send({ embeds: [dmEmbed] }).catch(() => {});
        await interaction.reply({ content: `Granted ${role.name} to ${user.tag} for ${durationStr}.`, ephemeral: true });
    } catch (err) {
        await interaction.reply({ content: 'Error: I may lack permissions.', ephemeral: true });
    }
}

function scheduleRoleRemoval(guildId, userId, roleId, removeAt) {
    const duration = removeAt - Date.now();
    if (duration <= 0) { removeRole(guildId, userId, roleId); return; }
    setTimeout(() => removeRole(guildId, userId, roleId), duration);
}

async function removeRole(guildId, userId, roleId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId).catch(() => null);
        const role = await guild.roles.fetch(roleId).catch(() => null);
        if (member && role && member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            const user = await client.users.fetch(userId);
            const dmEmbed = new EmbedBuilder().setColor(config.branding.warnColor).setTitle('Temporary Role Expired').setDescription(`Your temporary **${role.name}** role in **${guild.name}** has expired.`).setTimestamp().setFooter({ text: config.branding.serverName, iconURL: config.branding.serverIconURL });
            await user.send({ embeds: [dmEmbed] }).catch(() => {});
            const logChannel = guild.channels.cache.get(config.roleManagement.logChannelId);
            if(logChannel) {
                const logEmbed = new EmbedBuilder().setColor(config.branding.warnColor).setTitle('Role Removed (Automatic)').addFields({ name: 'User', value: user.tag }, { name: 'Role', value: role.name }).setTimestamp().setFooter({ text: 'Role Management Log' });
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
    } catch (error) { console.error(`Failed to remove role:`, error);
    } finally {
        db.prepare('DELETE FROM temp_roles WHERE userId = ? AND guildId = ? AND roleId = ?').run(userId, guildId, roleId);
    }
}

function checkAndScheduleRoleRemovals() {
    console.log('Checking database for pending role removals...');
    const rolesToRemove = db.prepare('SELECT * FROM temp_roles').all();
    for (const entry of rolesToRemove) {
        scheduleRoleRemoval(entry.guildId, entry.userId, entry.roleId, entry.removeAt);
    }
    console.log(`Found and scheduled ${rolesToRemove.length} pending role removals.`);
}


// --- ALL OTHER FEATURE LOGIC (Applications and Server Status) ---
async function handleApplyButton(interaction) {
    const user = interaction.user;
    if (activeApplications.has(user.id)) return interaction.reply({ content: 'You already have an active application!', ephemeral: true });
    try {
        const dmChannel = await user.createDM();
        await dmChannel.send("Welcome! Please answer the following questions. You have 15 minutes per question.");
        await interaction.reply({ content: 'I have DMed you to start your application!', ephemeral: true });
        startApplication(user, dmChannel);
    } catch (error) { await interaction.reply({ content: 'I could not DM you. Please enable DMs from server members.', ephemeral: true }); }
}

async function startApplication(user, dmChannel) {
    const answers = [];
    activeApplications.set(user.id, answers);
    for (const question of config.applicationQuestions) {
        await dmChannel.send(`**Question ${answers.length + 1}:**\n> ${question}`);
        try {
            const collected = await dmChannel.awaitMessages({ filter: m => m.author.id === user.id, max: 1, time: 900000, errors: ['time'] });
            answers.push({ question, answer: collected.first().content });
        } catch (error) { await dmChannel.send("Application timed out."); activeApplications.delete(user.id); return; }
    }
    await dmChannel.send("Thank you! Your application is submitted for review.");
    activeApplications.delete(user.id);
    postApplicationForReview(user, answers);
}

async function postApplicationForReview(user, answers) {
    const { reviewChannelId, reviewRoleId } = config.applicationSystem;
    const reviewChannel = await client.channels.fetch(reviewChannelId).catch(() => null);
    if (!reviewChannel) return console.error('Application review channel not found!');
    const embed = new EmbedBuilder().setColor(config.branding.successColor).setTitle(`New Application`).setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() }).setTimestamp().setFooter({ text: config.branding.serverName, iconURL: config.branding.serverIconURL });
    answers.forEach(item => embed.addFields({ name: `❓ ${item.question}`, value: `💬 ${item.answer}` }));
    await reviewChannel.send({ content: `<@&${reviewRoleId}>`, embeds: [embed] });
}

async function handleSimpleStatusButton(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'You do not have permission to use these buttons.', ephemeral: true });
    const { announcementChannelId, onlineButtonId, onlineImageURL, maintenanceImageURL } = config.serverStatus;
    const announcementChannel = client.channels.cache.get(announcementChannelId);
    if (!announcementChannel) return interaction.reply({ content: 'Announcement channel not configured.', ephemeral: true });
    let embed;
    if (interaction.customId === onlineButtonId) {
        embed = new EmbedBuilder().setColor(config.branding.successColor).setTitle('✅ Server Status: Online').setDescription('The server is now online!').setImage(onlineImageURL);
    } else {
        embed = new EmbedBuilder().setColor(config.branding.errorColor).setTitle('🛠️ Server Status: Maintenance').setDescription('The server is under maintenance.').setImage(maintenanceImageURL);
    }
    embed.setTimestamp().setFooter({ text: config.branding.serverName, iconURL: config.branding.serverIconURL });
    await announcementChannel.send({ embeds: [embed] });
    await interaction.reply({ content: 'Status announcement posted!', ephemeral: true });
}

async function handleRestartButton(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'You do not have permission to use these buttons.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId(config.serverStatus.restartModalId).setTitle('Announce Server Restart');
    const timeInput = new TextInputBuilder().setCustomId('restart-time-input').setLabel("Restart Time (e.g., 'in 10 minutes')").setStyle(TextInputStyle.Short).setPlaceholder('in 10 minutes').setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(timeInput));
    await interaction.showModal(modal);
}

async function handleRestartModalSubmit(interaction) {
    const time = interaction.fields.getTextInputValue('restart-time-input');
    const { announcementChannelId, restartImageURL } = config.serverStatus;
    const announcementChannel = client.channels.cache.get(announcementChannelId);
    if (!announcementChannel) return interaction.reply({ content: 'Announcement channel not configured.', ephemeral: true });
    const embed = new EmbedBuilder().setColor(config.branding.warnColor).setTitle('🔁 Server Restarting').setDescription(`The server will be restarting **${time}**.`).setImage(restartImageURL).setTimestamp().setFooter({ text: config.branding.serverName, iconURL: config.branding.serverIconURL });
    await announcementChannel.send({ embeds: [embed] });
    await interaction.reply({ content: 'Restart announcement posted!', ephemeral: true });
}

// =================================
//      BOT LOGIN
// =================================
client.login(process.env.DISCORD_TOKEN);