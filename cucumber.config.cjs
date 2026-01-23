module.exports = {
  default: {
    loader: ['ts-node/esm'],
    import: ['e2e/support/**/*.ts', 'e2e/steps/**/*.ts'],
    paths: ['e2e/features/**/*.feature'],
    timeout: 30000, // 30 seconds per step
    format: [
      'progress-bar',
      'html:e2e/reports/cucumber-report.html',
      'json:e2e/reports/cucumber-report.json',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    parallel: 1,
  },
}
