import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: '.env.local', override: false });
loadDotenv({ path: '.env', override: false });
import { createAndroidHarness } from '../scripts/_shared/androidHarness.ts';
import { createVerifierAdmin, createTempUser } from '../scripts/_shared/testUserDiscipline.ts';

const projectRoot = process.cwd();
const harness = createAndroidHarness({ projectRoot, devClientPort: 8081 });
const admin = createVerifierAdmin('office-warehouse-avd-login-probe');

const isAuthMissing = (xml) => /Auth session missing!/i.test(xml);
const isLoginScreen = (xml) => xml.includes('Email');
const isProfileScreen = (xml) =>
  xml.includes('profile-open-office-access') ||
  xml.includes('profile-open-active-context') ||
  xml.includes('profile-context-office') ||
  xml.includes('OTA diagnostics');

function findAndroidNode(nodes, predicate) {
  for (const node of nodes) {
    if (predicate(node)) return node;
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const devClient = await harness.ensureAndroidDevClientServer();
  const prepared = await harness.prepareAndroidRuntime({ clearApp: true, clearGms: false });
  const user = await createTempUser(admin, {
    role: 'warehouse',
    fullName: 'Office Warehouse AVD',
    emailPrefix: 'office.warehouse.avd',
  });

  const loginParams = {
    packageName: prepared.packageName,
    user,
    protectedRoute: 'rik://profile',
    artifactBase: 'office-warehouse-avd-profile',
    successPredicate: (xml) => isProfileScreen(xml),
    renderablePredicate: (xml) => isLoginScreen(xml) || isProfileScreen(xml) || isAuthMissing(xml),
    loginScreenPredicate: (xml) => isLoginScreen(xml),
  };

  let screen = await harness.loginAndroidWithProtectedRoute(loginParams);
  if (isAuthMissing(screen.xml)) {
    const alertNodes = harness.parseAndroidNodes(screen.xml);
    const okNode = findAndroidNode(alertNodes, (node) => {
      const label = String(node.text || '') + ' ' + String(node.contentDesc || '');
      return node.clickable && node.enabled && /\\bOK\\b/i.test(label);
    });
    if (okNode) {
      harness.tapAndroidBounds(okNode.bounds);
    } else {
      harness.pressAndroidKey(4);
    }
    await sleep(800);
    screen = await harness.loginAndroidWithProtectedRoute(loginParams);
  }
  screen = await harness.dismissAndroidInterruptions(screen, 'office-warehouse-avd-profile-post-login');
  const finalDump = harness.dumpAndroidScreen('office-warehouse-avd-profile-final');
  console.log(JSON.stringify({
    user,
    prepared,
    devClient,
    xmlPath: finalDump.xmlPath,
    pngPath: finalDump.pngPath,
    containsProfile: isProfileScreen(finalDump.xml),
    containsAuthMissing: isAuthMissing(finalDump.xml),
    containsLogin: isLoginScreen(finalDump.xml),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
