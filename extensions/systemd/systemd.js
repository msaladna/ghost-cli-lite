'use strict';

const fs = require('fs');
const execa = require('execa');
const getUid = require('./get-uid');
const chalk = require('chalk');
const {ProcessManager, errors} = require('../../lib');

const {CliError, ProcessError, SystemError} = errors;

class SystemdProcessManager extends ProcessManager {
    get systemdName() {
        return `ghost_${this.instance.name}`;
    }

    get logSuggestion() {
        return `journalctl -u ${this.systemdName} -n 50`;
    }

    start() {

    }

    stop() {

    }

    restart() {

        this._precheck();
        const {logSuggestion} = this;

        const portfinder = require('portfinder');
        const socketAddress = {
            port: null,
            host: 'localhost'
        };

        return portfinder.getPortPromise()
            .then((port) => {
                socketAddress.port = port;
                this.instance.config.set('bootstrap-socket', socketAddress);
                return this.instance.config.save();
            })
            .then(() => this.ui.sudo(`systemctl restart ${this.systemdName}`))
            .then(() => this.ensureStarted({logSuggestion, socketAddress}))
            .then(() => {
                this.instance.config.set('bootstrap-socket', null);
                return this.instance.config.save();
            })
            .catch((error) => {
                if (error instanceof CliError) {
                    throw error;
                }

                throw new ProcessError(error);
            });
    }

    isEnabled() {
       return false;
    }

    enable() {

    }

    disable() {

    }

    isRunning() {
        return false;
    }

    _precheck() {
        const uid = getUid(this.instance.dir);

        // getUid returns either the uid or null
        if (!uid) {
            throw new SystemError({
                message: 'Systemd process manager has not been set up or is corrupted.',
                help: `Run ${chalk.green('ghost setup linux-user systemd')} and try again.`
            });
        }

        if (fs.existsSync(`/lib/systemd/system/${this.systemdName}.service`)) {
            return;
        }

        throw new SystemError({
            message: 'Systemd process manager has not been set up or is corrupted.',
            help: `Run ${chalk.green('ghost setup systemd')} and try again.`
        });
    }

    static willRun() {
        try {
            execa.shellSync('which systemctl', {stdio: 'ignore'});
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = SystemdProcessManager;
