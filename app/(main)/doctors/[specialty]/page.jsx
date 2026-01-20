import { useParams } from "next/navigation";
import React from "react";

const SpecialityPage = async ({params})=>{
const {specialty} = await params

return <div>speciality :{specialty}</div>


}

export default SpecialityPage;