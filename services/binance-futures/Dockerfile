# Use Node.js 18 as the base image
FROM node:18

# Install additional tools for debugging and update certificates
RUN apt-get update && apt-get install -y \
    curl \
    dnsutils \
    ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3002

# Command to run the application
CMD ["node", "real-ai-server.js"]