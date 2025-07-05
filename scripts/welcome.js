#!/usr/bin/env node

/**
 * RSSFeeder Welcome Banner
 * 
 * Shows project information and next steps after successful setup
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const banner = `
${colors.cyan}╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  🚀 ${colors.bright}RSSFeeder Development Environment Ready!${colors.reset}${colors.cyan}           ║
║                                                               ║
║  ${colors.green}✅ Dependencies installed${colors.reset}${colors.cyan}                                 ║
║  ${colors.green}✅ Database initialized${colors.reset}${colors.cyan}                                   ║
║  ${colors.green}✅ Environment configured${colors.reset}${colors.cyan}                                 ║
║  ${colors.green}✅ Tests validated${colors.reset}${colors.cyan}                                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}📡 Your RSS Feed Aggregator is ready to go!${colors.reset}

${colors.yellow}🔗 Quick Links:${colors.reset}
   Backend API: ${colors.blue}http://localhost:3000/api/v1${colors.reset}
   Health Check: ${colors.blue}http://localhost:3000/health${colors.reset}
   Frontend: ${colors.blue}http://localhost:5173${colors.reset} ${colors.cyan}(when implemented)${colors.reset}

${colors.yellow}🛠️  Development Commands:${colors.reset}
   ${colors.green}npm run dev:backend${colors.reset}     Start backend server
   ${colors.green}npm run dev:frontend${colors.reset}    Start frontend (when available)
   ${colors.green}npm run dev${colors.reset}            Start both servers
   ${colors.green}npm test${colors.reset}               Run test suite
   ${colors.green}npm run check${colors.reset}          Run linting and tests

${colors.yellow}📚 Documentation:${colors.reset}
   ${colors.blue}QUICKSTART.md${colors.reset}                 Complete setup guide
   ${colors.blue}docs/API.md${colors.reset}                   API documentation
   ${colors.blue}docs/DEVELOPMENT_STAGE_PLAN.md${colors.reset}  Development roadmap

${colors.yellow}🎯 Current Stage: ${colors.green}B1 - Project Foundation & Database Setup${colors.reset}
   Run ${colors.green}npm run stage:check${colors.reset} to verify stage completion

${colors.yellow}🔮 Next Steps:${colors.reset}
   1. Start the development server: ${colors.green}npm run dev:backend${colors.reset}
   2. Test the API endpoints: ${colors.green}curl http://localhost:3000/health${colors.reset}
   3. Review the development plan: ${colors.green}less docs/DEVELOPMENT_STAGE_PLAN.md${colors.reset}
   4. Begin Stage B2: User Authentication System

${colors.magenta}Happy coding! 🎉${colors.reset}
`;

console.log(banner); 