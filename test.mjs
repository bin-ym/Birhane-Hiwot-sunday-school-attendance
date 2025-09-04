import bcrypt from "bcryptjs";

async function test() {
  const hash = "$2b$10$c0ZRBJ.E5dTzjuKYRr.ikOOb3K4bTVd42uI/40KJ2VvkwVfjyfKtO";
  const ok1 = await bcrypt.compare("123456", hash);  // try your guessed password
  console.log("Matches 123456?", ok1);

  const ok2 = await bcrypt.compare("yourrealpassword", hash);
  console.log("Matches real?", ok2);
}

test();
