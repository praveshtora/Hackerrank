import moment from "moment";
import knex from "knexClient";

export default async function getAvailabilities(date, numberOfDays = 7) {
  const availabilities = {};
  for (let i = 0; i < numberOfDays; ++i) {
    const tmpDate = moment(date).add(i, "days");
    availabilities[i] = {
      day: tmpDate.format("d"),
      date: tmpDate.toDate(),
      slots: []
    };
  }

  const lastDate = moment(date).add(numberOfDays,"days");

  const events = await knex
    .select("kind", "starts_at", "ends_at", "weekly_recurring")
    .from("events")
    .where(function() {
      this.where("weekly_recurring", true).andWhere(
        "starts_at",
        "<",
        +lastDate.toDate()
      );
    })
    .orWhere(function() {
      this.where("starts_at", ">=", +date).andWhere(
        "ends_at",
        "<=",
        +lastDate.toDate()
      );
    })
    .orderBy("kind", "desc");

  for (const event of events) {
    for (
      let date = moment(event.starts_at);
      date.isBefore(event.ends_at);
      date.add(30, "minutes")
    ) {
      if (event.weekly_recurring === 1) {
        const days = Object.values(availabilities).filter((ele) => ele.day === date.format("d"));
        if (event.kind === "opening") {
          days.forEach(ele => ele.slots.push(date.format("H:mm")));
        } else if (event.kind === "appointment") {
          days.forEach((ele) => {
            ele.slots = ele.slots.filter(
              slot => slot.indexOf(date.format("H:mm")) === -1
            );
          })
        }
      } else {
        const day = Object.values(availabilities).filter((ele) =>{
          let dateInMomentOfParticularDay = moment(ele.date);
          if(dateInMomentOfParticularDay.format("DDMMYYYY") === date.format("DDMMYYYY")) {
            return true;
          }
          return false;
        });
          if (event.kind === "opening") {
            day[0].slots.push(date.format("H:mm"));
          } else if (event.kind === "appointment") {
            day[0].slots = day[0].slots.filter((slot) => slot.indexOf(date.format("H:mm")) === -1);
          }
        }
      }
    }

  return Array.from(Object.values(availabilities));
}
