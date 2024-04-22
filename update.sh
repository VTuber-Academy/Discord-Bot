#!/bin/bash

cd ~/Discord-Bot

# Pull the latest changes from the Git repository
git pull
pm2 stop vtr-bot

# Install and build
yarn
rm -rf dist
yarn build

# Restart the bot using pm2
pm2 start vtr-bot