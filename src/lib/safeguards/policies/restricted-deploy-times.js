const week = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']

module.exports = function restrictedDeployTimesPolicy(policy, service, options = {}) {
  const { blockedWeekdays = [], blockedDates = [] } = options
  const now = new Date()

  const blockedDays = blockedWeekdays.map((day) => week.indexOf(day.toLowerCase().slice(0, 2)))

  if (blockedDays.includes(now.getDay())) {
    policy.fail(`Deploying on ${week[now.getDay()]} is not allowed`)
  } else if (blockedDates.includes(`${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`)) {
    policy.fail(
      `Deploying on ${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} is not allowed`
    )
  } else {
    policy.approve()
  }
}
