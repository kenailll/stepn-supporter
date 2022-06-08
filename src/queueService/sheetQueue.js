"use strict";
var Queue = require('bull');
const sheetQueue = new Queue('ProcessSheet');
require("../config/")

sheetQueue.process(2, async (job, done) => {
	const data = job.data;
	try {
		for (var i = 0; i < rows.length; i++) {
			if (data.email == rows[i].Username) {
				rows[i]['Cookie'] = data.cookie;
				rows[i]['SOL Address'] = data.sol_address;
				rows[i]['BSC Address'] = data.bsc_address;
				rows[i].Energy = `${data.energy}/${data.maxEnergy}`;
				rows[i]['GST Balance 103'] = data.gst_sol;
				rows[i]['GST Balance 104'] = data.gst_bsc;
				rows[i][date_now] = data.withdraw;

				await rows[i].save();
				break;
			}
		}
		console.log();
		done();
	} catch (error) {
		console.log('Sheet operation error', error);
		console.log();
		done(error);
	}
});


module.exports = sheetQueue;