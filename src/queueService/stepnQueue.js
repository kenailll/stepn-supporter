"use strict";
var Queue = require('bull');
const keyQueue = new Queue('ProcessStepn');
const sheetQueue = require("./sheetQueue");
const noxQueue = require("./noxQueue");

require("../config/")

keyQueue.process(1, async (job, done) => {
	const data = job.data;
	var index = undefined;

	//choose free STEPN object
	var stepn_api = stepn_apis.find(obj => {
		if (obj.id == undefined) {
			obj.id = job.id;
			obj.running = true;
			return obj
		}

		if (obj.email == data.email && !obj.running) {
			obj.running = true;
			return obj
		}
	});

	if (stepn_api != undefined) {
		try {
			index = stepn_apis.indexOf(stepn_api);

			//init accounts
			stepn_api._init(data.email, data.private, data.cookie);
			console.log(`Thread: ${index} -- ${stepn_api.email} -- ID: ${stepn_api.id} -- Init`)

			//login
			if (stepn_api.account_data.cookie != undefined && stepn_api.account_data.cookie != '') {
				let res = await stepn_api.userbasic();
				if (res.code == 0) {
					stepn_api.isLogin = true;
				} else {
					console.log(`Thread: ${index} -- ${stepn_api.email} -- Cookie expried`)
				}
			}

			stepn_api.firstTime = false;

			if (!stepn_api.isLogin) {
				if (inQueue[data.email] == undefined) {
					inQueue[data.email] = 1;
					console.log(`Thread: ${index} -- ${stepn_api.email} -- Add Nox`);

					await noxQueue.add({ email: data.email, password: data.password, thread: index }, {
						removeOnComplete: true
					});
				}

				await utils.sleep(20000);
			}

			if (!stepn_api.isLogin) {
				throw new Error('Login failed');
			}
			console.log(`Thread: ${index} -- ${stepn_api.email} -- Action -- OKKKK`)

			let sheet_data = {
				email: stepn_api.email,
				sol_address: stepn_api.account_data.userbasic.addrs.find(obj => obj.chain == 103).addr,
				bsc_address: stepn_api.account_data.userbasic.addrs.find(obj => obj.chain == 104).addr,
				gst_sol: stepn_api.account_data.userbasic.asset.find(obj => obj.chain == 103 && obj.token == 3000).value,
				gst_bsc: stepn_api.account_data.userbasic.asset.find(obj => obj.chain == 104 && obj.token == 3000).value,
				energy: stepn_api.account_data.userbasic.energy,
				maxEnergy: stepn_api.account_data.userbasic.maxE,
				withdraw: stepn_api.GST_withdraw,
				cookie: stepn_api.account_data.cookie
			}
			console.log(sheet_data)
			await sheetQueue.add(sheet_data, {
				removeOnComplete: true
			});

			stepn_api.id = undefined;
			stepn_api.running = false;
			done();
		} catch (error) {
			console.log(`Thread: ${index} -- ${stepn_api.email} -- Error -- ${error}`)
			done(error);
		}
	} else {
		done();
		await keyQueue.add(data, {
			removeOnComplete: true
		});
	}
});

module.exports = keyQueue;