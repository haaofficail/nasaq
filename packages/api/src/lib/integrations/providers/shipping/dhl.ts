import { IntegrationProvider } from "../../base";

export class DHLProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const auth = Buffer.from(`${this.credentials.api_key}:${this.credentials.api_secret}`).toString("base64");
      const res = await fetch(
        "https://api-mock.dhl.com/mydhlapi/rates?accountNumber=test&originCountryCode=SA&originCityName=Riyadh&destinationCountryCode=SA&destinationCityName=Jeddah&weight=1&length=10&width=10&height=10&plannedShippingDateAndTime=2024-01-01T10:00:00GMT%2B03:00&isCustomsDeclarable=false&unitOfMeasurement=metric&nextBusinessDay=false&strictValidation=false&getAllValueAddedServices=false&requestEstimatedDeliveryDate=true&estimatedDeliveryDateType=QDDF",
        {
          headers: { Authorization: `Basic ${auth}` },
          signal: AbortSignal.timeout(30000),
        }
      );
      return { ok: res.status < 500 };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
