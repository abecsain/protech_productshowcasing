export function priceVisible(enabled:boolean, expiresAt:string|null|undefined, now?:number):boolean;
export function pagination(pageValue:unknown, limitValue:unknown, maxLimit?:number):{page:number;limit:number;offset:number};
export function validPassword(password:string,mobile:string):boolean;
export function cloudinaryProductId(value:unknown):boolean;
export function hasRole(principal:{role:string}|null|undefined,role:string):boolean;
export function canRequestUpload(role:string|null|undefined):boolean;
export function lockoutState(failed:number,lockedUntil:string|null,now?:number):{locked:boolean;failed:number;lockedUntil?:string|null};
