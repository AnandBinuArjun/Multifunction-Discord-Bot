# Multifunction-Discord-Bot

A comprehensive, all-in-one Discord bot designed to automate and streamline the management of a FiveM roleplay community. This bot is built with Node.js, discord.js v14, and uses a persistent SQLite database for reliability.

*(Note: This is a placeholder image representing a bot's embed)*

-----

## ✨ Features

This bot is packed with features to reduce manual work for your staff and improve the experience for your members.

  * 📝 **Application System:** A fully automated application process. Admins create a panel with a button, and users apply via a private DM conversation. Completed applications are posted in a staff-only channel.
  * 🎟️ **Ticket System:** A professional support ticket system. Users click a button to create a private ticket channel with support staff, who can close the ticket with another button.
  * ⚙️ **Server Status Panel:** An admin-only control panel with buttons to instantly post beautiful, branded announcements about server status (Online, Restart, Maintenance) to a public channel.
  * ⏳ **Persistent Temporary Roles:** Grant users a role for a specific duration (e.g., "7d" for VIP). The bot automatically removes the role when the time expires and **remembers all scheduled tasks even if it restarts**, thanks to its SQLite database.
  * 🎤 **Voice Channel Notifier:** Automatically announces in a text channel when a user joins a designated voice channel, helping to encourage community interaction.
  * 🎨 **Fully Customizable Branding:** Almost every message the bot sends is an embed that can be customized with your server's name, logo, colors, and images via a simple configuration file.

-----

## 📋 Prerequisites

Before you begin, ensure you have the following:

  * [Node.js](https://nodejs.org/) (v16.9.0 or higher)
  * A Discord Bot Token from the [Discord Developer Portal](https://discord.com/developers/applications)
  * A Discord server where you have Administrator permissions.

-----

## 🚀 Installation & Setup

Follow these steps to get your bot up and running.

1.  **Download the Code**
    Download all the provided files (`index.js`, `deploy-commands.js`, `database.js`, `config.json`, `.env`) and place them in a new folder on your computer or server.

2.  **Install Dependencies**
    Open a terminal in the bot's folder and run the following command to install all the necessary libraries:

    ```bash
    npm install
    ```

3.  **Configure Environment**
    Rename the `.env.template` file to `.env` and paste your Discord bot token inside it.

    ```env
    DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
    ```

4.  **Configure the Bot**
    Open `config.json` and carefully fill in all the required IDs and URLs. Right-click on channels, roles, and users in Discord to get their IDs (you must have Developer Mode enabled in Discord settings). For image URLs, upload your images to a service like [Imgur](https://imgur.com/) and use the direct image link.

5.  **Deploy Commands**
    Before starting the bot, you need to register its slash commands with Discord.

      * First, get your bot's **Client ID** from the "General Information" page on the Discord Developer Portal.
      * Paste this ID into the `deploy-commands.js` file, replacing `YOUR_CLIENT_ID_HERE`.
      * Run the script from your terminal:
        ```bash
        node deploy-commands.js
        ```

6.  **Invite the Bot**

      * On the Developer Portal, go to "OAuth2" -\> "URL Generator".
      * Select the scopes: `bot` and `applications.commands`.
      * In the "Bot Permissions" section below, grant it `Administrator` permissions for simplicity, or select the individual permissions it needs (`Manage Roles`, `Manage Channels`, `Send Messages`, `Read Message History`, etc.).
      * Copy the generated URL and paste it into your browser to invite the bot to your server.

7.  **Start the Bot**
    You're all set\! Start the bot by running:

    ```bash
    node index.js
    ```

    You should see `🟢 Bot is online!`, `Database connected`, and other startup messages in your console.

-----

## 🔧 Configuration (`config.json`)

This file is the brain of your bot's customization.

| Section             | Key                      | Description                                                              |
| ------------------- | ------------------------ | ------------------------------------------------------------------------ |
| `branding`          | `serverName`, `serverIconURL`, colors | Sets the default name, icon, and colors for embeds.                      |
| `applicationSystem` | `reviewChannelId`, `reviewRoleId` | Channel where completed applications are sent and the role to ping.      |
| `voiceNotifier`     | `notificationChannelId`, `channelsToWatch` | Channel for VC join alerts, and which VCs to monitor.                    |
| `serverStatus`      | `announcementChannelId`, image URLs | Channel for public status updates and the images for each status.        |
| `roleManagement`    | `logChannelId`           | Channel for logging temporary role additions and removals.                 |
| `ticketSystem`      | All IDs                  | Configure channels, roles, and the category for the ticket system.       |
| `applicationQuestions`| (Array of strings)       | The list of questions the bot will ask during the application process.   |

-----

## ⚙️ Usage (Admin Commands)

Once the bot is running, use these slash commands in your Discord server to set up its features.

  * `/setup-application`

      * Run this in the channel where you want users to start applying (e.g., `#applications`). The bot will post the panel with the "Start Application" button.

  * `/setup-ticket-panel`

      * Run this in the channel where you want users to request help (e.g., `#support`). The bot will post the panel with the "Create Ticket" button.

  * `/server-panel`

      * **IMPORTANT:** Run this in a **private staff-only channel**. The bot will post the control panel with buttons for managing public server status announcements.

  * `/add-role`

      * Use this command to grant a temporary role to a user.
      * **Usage:** `/add-role user:@User role:@Role duration:7d reason:VIP Trial`

-----

### A Note on Persistence

This bot uses **SQLite** to store data about temporary roles. This information is saved to a file named `data.sqlite` in your project folder.

This database ensures that if your bot restarts for any reason (e.g., a power outage, server maintenance, or a crash), it will automatically check for any pending role removals and reschedule them correctly. This makes the temporary role feature highly reliable.

-----

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
