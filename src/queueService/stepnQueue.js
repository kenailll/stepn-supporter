"use strict";
var Queue = require('bull');
const stepnQueue = new Queue('ProcessStepn');
const sheetQueue = require("./sheetQueue");
const noxQueue = require("./noxQueue");

require("../config/")

stepnQueue.process(thread, async (job, done) => {
	const data = job.data;

	//choose free STEPN object
	var stepn_api = stepn_apis.find(obj => {
		console.log(`Job ID: ${job.id} -- Email: ${data.email} -- Slot: ${obj.id} -- !obj.running`, !obj.running)
		if (!obj.running) {
			console.log(`Job ID: ${job.id} -- Email: ${data.email} -- Slot: ${obj.id} -- obj.email == data.email`, obj.email == data.email)
			if (obj.email == data.email) {
				obj._init(data.email, data.private, data.cookie);
				return obj
			}
			console.log(`Job ID: ${job.id} -- Email: ${data.email} -- Slot: ${obj.id} -- stepn_apis.every != data.email`, stepn_apis.every(objx => objx.email != data.email))

			if(stepn_apis.every(objx => objx.email != data.email)){
				obj._init(data.email, data.private, data.cookie);
				obj.job_id = job.id;
				return obj
			}
		}
	});

	try {
		//init accounts
		console.log(`Job ID: ${job.id} -- Email: ${stepn_api.email} -- Slot: ${stepn_api.id} -- Init`)

		//login
		if (stepn_api.account_data.cookie != undefined && stepn_api.account_data.cookie != '') {
			let res = await stepn_api.userbasic();
			if (res.code == 0) {
				stepn_api.isLogin = true;
			} else {
				console.log(`Job ID: ${job.id} -- Email: ${stepn_api.email} -- Slot: ${stepn_api.id} -- Cookie expried`)
			}
		}

		stepn_api.firstTime = false;

		if (!stepn_api.isLogin) {
			if (inQueue[data.email] == undefined) {
				inQueue[data.email] = 1;
				console.log(`Job ID: ${job.id} -- Email: ${stepn_api.email} -- Slot: ${stepn_api.id} -- Add Nox`);

				var noxJob = await noxQueue.add({ email: data.email, password: data.password, id: stepn_api.id });
				await noxJob.finished();
			}
		}

		if (!stepn_api.isLogin) {
			throw new Error('Login failed');
		}

		//do some actions here
		//GST withdraw chain 103
		// let GST_res = await stepn_api.withdraw();
		// console.log(`Job ID: ${job.id} -- Email: ${stepn_api.email} -- Slot: ${stepn_api.id} -- Action --`, GST_res)

		// if (GST_res.code == 102001) {
		// 	throw 'Cookie expried';
		// }

		//NFT withdraw
		// let NFT_res = await stepn_api.withdrawNFTs();
		// console.log(`Job ID: ${job.id} -- Email: ${stepn_api.email} -- Slot: ${stepn_api.id} -- Action --`, NFT_res)

		// if(NFT_res.code == 102001){
		// 	throw 'Cookie expried';
		// }

		console.log(`Job ID: ${job.id} -- Email: ${stepn_api.email} -- Slot: ${stepn_api.id} -- Action -- OKKKK`)

		let sheet_data = {
			email: stepn_api.email,
			sol_address: stepn_api.account_data.userbasic.addrs.find(obj => obj.chain == 103).addr,
			bsc_address: stepn_api.account_data.userbasic.addrs.find(obj => obj.chain == 104).addr,
			gst_sol: stepn_api.account_data.userbasic.asset.find(obj => obj.chain == 103 && obj.token == 3000).value,
			gst_bsc: stepn_api.account_data.userbasic.asset.find(obj => obj.chain == 104 && obj.token == 3000).value,
			energy: stepn_api.account_data.userbasic.energy,
			maxEnergy: stepn_api.account_data.userbasic.maxE,
			withdraw: stepn_api.GST_withdraw
		}

		await sheetQueue.add(sheet_data, {
			removeOnComplete: true,
			attempts: 3, // If job fails it will retry till 3 times
			backoff: 10000 // static 10 sec delay between retry
		});

		done();
	} catch (error) {
		console.log(`Job ID: ${job.id} -- Email: ${data.email} -- Error -- ${error}`)
		done(error);
	}
});

stepnQueue.on('global:failed', function (job_id) {
	var stepn_api = stepn_apis.find(obj => obj.job_id == job_id);
	if (stepn_api != undefined) {
		console.log(`Job ID: ${job_id} -- Email: ${stepn_api.email} -- Global Failed`)

		stepn_api.email = '';
		stepn_api.GST_withdraw = 0;
		stepn_api.running = false;
	}
});

stepnQueue.on('failed', function (job) {
	var stepn_api = stepn_apis.find(obj => obj.job_id == job.id);
	if (stepn_api != undefined) {
		console.log(`Job ID: ${job.id} -- Email: ${stepn_api.email} -- Failed ${job.attemptsMade}/${job.opts.attempts}`);
		stepn_api.running = false;
	}
});

stepnQueue.on('completed', function (job, result) {
	var stepn_api = stepn_apis.find(obj => obj.job_id == job.id);
	
	if (stepn_api != undefined) {
		console.log(`Job ID: ${job.id} -- Email: ${stepn_api.email} -- Complete`)
		stepn_api.email = '';
		stepn_api.GST_withdraw = 0;
		stepn_api.running = false;
	}
});

module.exports = stepnQueue;