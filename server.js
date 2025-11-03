// Example Node.js backend endpoints
app.post('/api/save-token', (req, res) => {
    const { token, userId, platform } = req.body;
    // Save to database
    console.log('Token saved:', token);
    res.json({ success: true });
});

app.post('/api/send-notification', async (req, res) => {
    const { title, body, tokens } = req.body;
    
    const message = {
        notification: { title, body },
        tokens: tokens // Array of FCM tokens
    };
    
    try {
        const response = await admin.messaging().sendMulticast(message);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});