export const checkAddress = (address: string): boolean => {
  const addressId = toAddressId(address);
  if (addressId.length != 6) {
    return false;
  }
  return checkHexNumber(addressId)
};

export const checkHexNumber = (value: string): boolean => {
  if (value.substring(0, 2).toLocaleLowerCase() == "0x") {
    value = value.substring(2)
  }

  const check_value = [...value]
  if (check_value.length % 2 != 0) {
    return false;
  }
  for (let i = 0; i < check_value.length; i++) {
    if (!checkValidHexValue(check_value[i])) {
      return false;
    }
  }
  return true;
}

export const checkValidHexValue = (value: string): boolean => {
  const valid_chars = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
  ];
  return valid_chars.includes(value.toLocaleLowerCase())
}

export const toAddressId = ((address: string) => address.toLocaleLowerCase().split(".").join(""))

export const toAddress = ((address: string) => {
  const addressId = toAddressId(address);
  return [
    addressId.substring(0, 2),
    addressId.substring(2, 4),
    addressId.substring(4, 6)
  ].join(".").toLocaleUpperCase()
});