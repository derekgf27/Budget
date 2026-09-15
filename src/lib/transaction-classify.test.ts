import { describe, expect, it } from "vitest";
import {
  billNameMatchesTx,
  exclusionStatusLabel,
  isCreditCardPayment,
  shouldAutoExcludeTransaction,
} from "./transaction-classify";

describe("shouldAutoExcludeTransaction", () => {
  it("excludes Apple Card payments from the bank", () => {
    expect(
      shouldAutoExcludeTransaction(
        "EFT PMT APPLECARD GSBANK PAYMENT XXXXXXXXXXX3471",
        "Apple Card",
      ),
    ).toBe("credit_card_payment");
  });

  it("does not exclude ATH Móvil merchant payments", () => {
    expect(
      shouldAutoExcludeTransaction(
        "TRANF ATHM PIZZOLOGIA 9999 ON 09/05/26",
        "Tranf Athm Pizzologia",
      ),
    ).toBeNull();
  });
});

describe("exclusionStatusLabel", () => {
  it("labels Apple Card payments clearly", () => {
    expect(
      exclusionStatusLabel(
        "EFT PMT APPLECARD GSBANK PAYMENT XXXXXXXXXXX3471",
        "Apple Card",
      ),
    ).toBe("Credit card payment");
  });
});

describe("isCreditCardPayment", () => {
  it("detects payment thank you", () => {
    expect(isCreditCardPayment("Payment Thank You - Apple Card")).toBe(true);
  });
});

describe("billNameMatchesTx", () => {
  it("matches T-Mobile to Phone - TMobile", () => {
    expect(billNameMatchesTx("Phone - TMobile", "T-Mobile", "T-Mobile")).toBe(
      true,
    );
  });

  it("matches Spotify", () => {
    expect(billNameMatchesTx("Spotify", "Spotify", "Spotify")).toBe(true);
  });

  it("matches Cursor bill to Cursor IDE charge", () => {
    expect(
      billNameMatchesTx(
        "Cursor",
        "Cursor, Ai Powered Ide",
        "Cursor, Ai Powered Ide",
      ),
    ).toBe(true);
  });
});

describe("matchBillForTransaction", () => {
  it("links Cursor charge to Cursor bill", async () => {
    const { matchBillForTransaction } = await import("./transaction-classify");
    const hit = matchBillForTransaction(
      {
        name: "Cursor, Ai Powered Ide",
        merchantName: "Cursor, Ai Powered Ide",
        amountCents: 2000,
      },
      [{ id: "1", name: "Cursor", amountCents: 2000 }],
    );
    expect(hit?.name).toBe("Cursor");
  });
});
