#!/bin/bash

cd ~/Discord-Bot

# Pull the latest changes from the Git repository
git pull

# Install any new dependencies
npm install

# Restart the bot using pm2
pm2 restart vtr-bot