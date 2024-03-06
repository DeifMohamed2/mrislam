require('dotenv').config()
const express = require('express');
const morgan = require('morgan')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
const MongoStore = require('connect-mongo')
const session = require('express-session')
const fileUpload = require('express-fileupload');
const cors = require('cors')



const fs = require('fs')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
// const { authenticateUser } = require('./middleware/authMiddleware')




const homeRoutes = require('./routes/homeRoutes')
const teacherRoutes = require('./routes/teacherRoutes')
const studentRoutes = require('./routes/studentRoutes');
// express app
const app = express();
const socketio = require('socket.io');
const path = require('path');


// CONECT to mongodb
let io
const dbURI = 'mongodb+srv://3devWay:1qaz2wsx@cluster0.5orkagp.mongodb.net/MrIslam?retryWrites=true&w=majority&appName=Cluster0'
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((result) => {
        let server = app.listen(8800);

        io = socketio(server)
        io.on('connection', (socket) => {
            console.log(`New connection: ${socket.id}`);
        })

        console.log("Dadad")
    }).catch((err) => {
        console.log(err)
    })

// register view engine
app.set('view engine', 'ejs');
// listen for requests


app.use(cors())
app.use((req, res, next) => {
    req.io = io; // Attach io to the request object
    next(); // Move to the next middleware or route handler
});

app.use(morgan('dev'));
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(fileUpload());
// let uri = ""; // Declare the 'uri' variable

app.use(session({
    secret: "Keybord",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: dbURI
    }),

}))


// Custom middleware to make io accessible in all routes


app.use('/', homeRoutes)
app.use('/teacher', teacherRoutes)
app.use('/student', studentRoutes)








const Excel = require('exceljs');


app.post("/teacher/uploadVideo", async (req, res) => {


    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Video Data');

    const headerRow = worksheet.addRow(['#', 'User Name', 'Student Code', 'Student Phone', 'Parent Phone']);
 
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users_data.xlsx');

    // Send Excel file as response

    if (!req.files || !req.files.filetoupload) {
        return res.status(400).send('No files were uploaded.');
    }

    const uploadedFile = req.files.filetoupload;
    const uploadDirectory = path.join(__dirname, 'uploads'); // Directory where uploaded files will be stored

    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory);
    }

    // Save the uploaded file
    const filePath = path.join(uploadDirectory, uploadedFile.name);

    uploadedFile.mv(filePath, async (err) => {
        if (err) {
            return res.status(500).send(err);
        }

        try {
            const Vimeo = require('vimeo').Vimeo;

            // Instantiate the Vimeo client with your credentials
            const client = new Vimeo(
                "58133a717ee5c29b2f419d7841021b1fc6d306c1", // Client ID
                "NMEyxm7hJ0RPC01v6u8n5Cn+Z0DvfdP7YeYLVGYdrfx+62BmhW9fwKJtOI2pw6OBuVOeObUoJvBlMbYoWedlobZ13teA3ewTO16+Tg2WrhbO1pTMgVnPvJHpB+cK2X8m", // Client Secret
                "b08f6b1dab35f2ae9ebb4e44ca25d9f2" // Access Token
            );

            // Specify the folder URI
            const folderUri = "/folders/19740524";

            // Upload video to Vimeo and assign it to the specified folder
            client.upload(
               
                filePath,
                {
                    name: uploadedFile.name,
                    description: "This video was uploaded through the Vimeo API's NodeJS SDK.",
                    upload: {
                        approach: 'pull',
                        size: uploadedFile.size,
                        folder: folderUri // Assign video to the specified folder
                    }
                },
                function (uri) {
           
                },
                function (bytesUploaded, bytesTotal) {
                    // Progress callback
                    console.log(bytesUploaded, bytesTotal);
                },
                function (error) {
                    // Error callback
                    console.error('Failed because: ' + error);
                    res.status(500).send('Failed to upload video.');
                }
            );
            setTimeout(() => {
                client.request(uri + '?fields=link', function (error, body, status_code, headers) {
                    if (error) {
                        console.error('Failed to get video link:', error);
                        res.status(500).send('Failed to get video link.');
                    } else {
                        const videoLink = body.link;
                        console.log('Video link:', videoLink);
                        io.emit('videoLink', { videoLink: videoLink });
                        res.send(excelBuffer); // Sending Excel file as response after video upload and link retrieval
                    }
                });
            }, 5000); 
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Error uploading video.');
        }
    });

    res.send(excelBuffer);
});








// 404 page
app.use((req, res) => {
    res.status(404).render('404', { title: '404' });
});
