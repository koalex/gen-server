require('dotenv').config();
const path   = require('path');
const config = require('config');

module.exports = {
    apps : [{
        name: config.appName,
        script: path.join(__dirname, '../bin/server.js'),
        exec_mode: 'cluster',
        max_memory_restart: '2G',
        pid_file: path.join(__dirname, 'server.pid'),
        source_map_support: true,
        wait_ready: true,
        listen_timeout: 3000,
        kill_timeout: 2000, // ms
        watch: false,
        autorestart: true,
        min_uptime: 1000, // ms
        max_restarts: 4, // Number of times a script is restarted when it exits in less than min_uptime
        instances: 'max',
        instance_var: 'INSTANCE_ID', // For example, if you want to run a cronjob only on one cluster, you can check: if process.env.NODE_APP_INSTANCE === 0
        env: {
            PROTOCOL: process.env.PROTOCOL,
            HOST: process.env.HOST,
            PORT: Number(process.env.PORT)
        },
        env_production: {
            NODE_ENV: 'production',
            PROTOCOL: process.env.PROTOCOL,
            HOST: process.env.HOST,
            PORT: Number(process.env.PORT)
        },
        merge_logs: true, // merge logs in cluster mode
        log_type: 'json',
        output: path.join(config.logsRoot, 'pm2.out.log'), // is only standard output (console.log)
        error: path.join(config.logsRoot, 'pm2.error.log'), // is only error output (console.error)
        // log: './logs/pm2.combined.outerr.log', // combines output and error, disabled by default
    }],
    deploy: {
        development: {},
        staging: {},
        production: {
            env: {
                NODE_ENV: 'production',
                PORT: Number(process.env.PORT),
                HOST: process.env.HOST
            },
            // SSH key path, default to $HOME/.ssh
            // key: '/path/to/some.pem',
            // SSH user
            user: process.env.PM2_USER,
            // SSH host
            host: [process.env.PM2_HOST],
            // SSH options with no command-line flag, see 'man ssh'
            // can be either a single string or an array of strings
            ssh_options: ['StrictHostKeyChecking=no'/*, 'PasswordAuthentication=no'*/],
            // GIT remote/branch
            ref: 'origin/master',
            // GIT remote
            repo: 'https://github.com/koalex/gen-server.git',
            // path in the server
            path: process.env.PM2_PATH,
            // Pre-setup command or path to a script on your local machine
            // 'pre-setup': 'apt-get install git ; ls -la',
            // Post-setup commands or path to a script on the host machine
            // eg: placing configurations in the shared dir etc
            // 'post-setup': 'ls -la',
            // pre-deploy action
            // 'pre-deploy-local': 'echo \'This is a local executed command\'',
            // post-deploy action
            'post-deploy': 'npm install && git submodule init && git submodule update && pm2 startOrReload pm2/ecosystem.config.js --env production'
        }
    }
};
