const express = require("express");
const router = express.Router();
const fs = require('fs');
const csv = require('@fast-csv/parse');
const moment = require('moment');


router.post("/csv", (req, res) => {
  let { csvData } = req.body;
  if (csvData)
    fs.writeFile('./input.csv', csvData, 'utf8', function (err) {
      if (err) {
        res.status(500).send({ result: "something went wrong! Please try again" });
      } else {
        calculateTime(req, res);
      }
    });
  else
    res.status(500).send({ result: "You did not insert timesheet data" });
})

function timestrToSec(timestr) {
  var parts = timestr.split(":");
  return (parts[0] * 3600) +
    (parts[1] * 60) +
    (+parts[2]);
}

function pad(num) {
  if (num < 10) {
    return "0" + num;
  } else {
    return "" + num;
  }
}

function formatTime(seconds) {
  return [pad(Math.floor(seconds / 3600)),
  pad(Math.floor(seconds / 60) % 60),
  pad(seconds % 60),
  ].join(":");
}


const timeDiff = (now, then) => {
  var ms = moment(now, "DD/MM/YYYY HH:mm:ss").diff(moment(then, "DD/MM/YYYY HH:mm:ss"));
  var d = moment.duration(ms);
  return Math.floor(d.asHours()) + moment.utc(ms).format(":mm:ss");
}


function strToMins(t) {
  var s = t.split(":");
  return Number(s[0]) * 60 + Number(s[1]);
}

function minsToStr(t) {
  return Math.trunc(t / 60) + ':' + ('00' + t % 60).slice(-2);
}

const calculateTime = (req, res) => {
  let arr = [];
  let header = [];

  try {
    fs.createReadStream('./input.csv')
      .pipe(csv.parse())
      .on('error', (error) => console.error(error))
      .on('data', (row) => {
        let str = String(row[0]).split("\t");
        let tempArr = {};
        if (header.length > 0) {
          str.map((item, index) => {
            if (String(header[index]) == 'In Time' || String(header[index]) == 'Out Time') {
              let length = String(item).length;
              let tempStr = String(item).substr(length - 4, length);
              tempArr[String(header[index]).replace(/\s/g, '')] = String(item).replace(tempStr, "");
            }
            else
              tempArr[String(header[index]).replace(/\s/g, '')] = item;
          })
          arr.push(tempArr)
        }
        else
          str.map(item => {
            header.push(item);
          })

      })
      .on('end', (rowCount) => console.log(`Parsed ${rowCount} rows`));

    setTimeout(() => {
      let totaltime = '00:00:00';
      let notPrintedTime = '00:00:00';
      let workingHour = "08:30:00";
      let officeHour = "09:30:00";
      let initialInTime = '00:00:00';
      let remainingOfficeTime = '00:00';
      let remainingWorkingTime = '00:00';
      let isOfficeTimeCompleted = false;
      let isWorkingTimeCompleted = false;
      let lastOutTime;

      let currentTime = moment(new Date()).format("DD/MM/YYYY HH:mm:ss");
      // var currentTime = "22/11/2021 19:00:00";
      let lastIndex = arr.length - 1;
      console.log(arr.length, "last index")
      if (!arr.length > 0) {
        res.status(500).send({ error: "Input is not valid! Please try again" });
        return;
      }

      arr.map((item, index) => {
        if (!item?.InTime) {
          res.status(500).send({ error: "Input is not valid! Please try again" });
          return;
        }

        if (index == 0)
          initialInTime = moment(item.InTime).format("DD/MM/YYYY HH:mm:ss");
        if (index == lastIndex && item?.OutTime)
          lastOutTime = moment(item.OutTime).format("DD/MM/YYYY HH:mm:ss");
        if (item?.WorkingHours)
          totaltime = formatTime(timestrToSec(totaltime) + timestrToSec(item.WorkingHours));
        else {
          if (item?.InTime) {
            let then = moment(item.InTime).format("DD/MM/YYYY HH:mm:ss");
            notPrintedTime = timeDiff(currentTime, then);
          }
        }
      })

      // console.log(arr, "jsjsjsj")
      let completedWorkingTime = formatTime(timestrToSec(totaltime) + timestrToSec(notPrintedTime));
      let comletedOfficeTime = moment(timeDiff(lastOutTime ? lastOutTime : currentTime, initialInTime), "HHmmss").format("HH:mm:ss");
      if (comletedOfficeTime > officeHour)
        isOfficeTimeCompleted = true;
      else {
        isOfficeTimeCompleted = false;
        var result = minsToStr(strToMins(officeHour) - strToMins(comletedOfficeTime));
        remainingOfficeTime = result;
      }

      if (completedWorkingTime > workingHour)
        isWorkingTimeCompleted = true;
      else {
        isWorkingTimeCompleted = false;
        var result = minsToStr(strToMins(workingHour) - strToMins(completedWorkingTime));
        remainingWorkingTime = result;
      }

      let resultObj = {
        comletedOfficeTime,
        completedWorkingTime,
        remainingOfficeTime,
        remainingWorkingTime,
        isOfficeTimeCompleted,
        isWorkingTimeCompleted
      }

      res.status(200).send({ result: resultObj });
    }, 1000);
  } catch (error) {
    console.log(error)
    res.status(500).send({ error: "Input is not valid! Please try again" });
  }
}

module.exports = router;