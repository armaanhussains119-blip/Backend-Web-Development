'use strict';

const { Worker } = require('bullmq');
const { connection } = require('./queue');
const { transporter } = require('./email');

const worker = new Worker(
  'email',
  async (job) => {
    if (job.name === 'otp') {
      await transporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@example.com',
        to: job.data.to,
        subject: 'Your verification code',
        text: `Your OTP is ${job.data.otp}`,
      });
    }

    return { ok: true };
  },
  {
    connection,
    // Ensure the queue defaults are also applied for OTP jobs.
  }
);

worker.on('completed', (job) => {
  console.log(`Worker completed job ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.log(`Worker failed job ${job ? job.id : 'unknown'}: ${err.message}`);
});

module.exports = { worker };
