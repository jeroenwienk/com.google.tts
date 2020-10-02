'use strict';

const Homey = require('homey');
const googleTTS = require('google-home-audio-tts');

class App extends Homey.App {

    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }

    onInit() {
        console.log(`${Homey.manifest.id} running...`);

        let FoundDevices = [];
        let ttsAction = this.homey.flow.getActionCard('tts');

        FoundDevices['Broadcast'] = {name: 'Broadcast', description: 'Broadcast to all devices'};

        const discoveryStrategy = this.homey.discovery.getStrategy('googlecast');

        Object.entries(discoveryStrategy.getDiscoveryResults()).forEach(([key, value]) => {
            let db = {};
            db.id = value.id;
            db.host = value.address;
            db.name = value.txt.fn;
            db.description = value.txt.md;

            FoundDevices[value.id] = db;
        });

        ttsAction.registerRunListener((args, state) => {
            return new Promise((resolve, reject) => {
                let device = new googleTTS(null, args.language);

                device.setTtsTimeout(5000);

                if (args.speed === 'slow')
                    device.setTtsSpeed(0.24)

                if (args.volume > 0.0 && args.volume <= 1.0)
                    device.setVolume(args.volume)

                if (args.device.name === 'Broadcast') {
                    device.getTtsUrl(args.text).then((url) => {
                        for (let device_data in FoundDevices) {
                            if (FoundDevices[device_data].name === 'Broadcast')
                                continue;

                            device.setIp(FoundDevices[device_data].host);
                            device.audio(url, (result) => {
                                resolve();
                            });
                        }
                    });
                } else {
                    let ip = this.findDeviceIP(FoundDevices, args.device);

                    if (ip == null || ip === "0.0.0.0")
                        return reject();

                    device.setIp(ip);
                    device.tts(args.text, (result) => {
                        resolve();
                    });
                }
            });
        }).getArgument('device').registerAutocompleteListener((query, args) => {
            let devices = []

            for (let device_data in FoundDevices)
                if (FoundDevices[device_data].name.toLowerCase().indexOf(query.toLowerCase()) > -1 || FoundDevices[device_data].description.toLowerCase().indexOf(query.toLowerCase()) > -1)
                    devices.push(FoundDevices[device_data]);

            return Promise.resolve(devices);
        });
    }

    findDeviceIP(FoundDevices, device) {
        for (let device_data in FoundDevices)
            if (FoundDevices[device_data].name === device.name || (FoundDevices[device_data].id != null && FoundDevices[device_data].id === device.id))
                return FoundDevices[device_data].host;

        return "0.0.0.0";
    }

}

module.exports = App;
