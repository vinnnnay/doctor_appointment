"use server"

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server"
import { VerificationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { success } from "zod";

export async function verifyAdmin(){
    const {userId} = await auth();

    if(!userId){
        return false;
    }
    try{
        const user = await user.findUnique({
            where:{
                clerkUserId:userId,
            },

        });
        return user?.role === "ADMIN";

    }
    catch(error){
        console.log("failed to verify admin:" , error);
        return false;
    }



}

export async function getPendingDoctors(){


    const isAdmin  = await  verifyAdmin();
    if(!isAdmin) throw new Error("unthauthorized")
    try{
        const pendingDoctors = await db.user.findMany({
        where:{
            role:"DOCTOR",
            VerificationStatus:"PENDING",

        },
        orderBy:{
            createdAt:"desc"
        }

    })  
    return {doctors:pendingDoctors};

   }
   catch(error){
    throw new Error("failed to fetch pending doctors")
   }    

     

}


export async function getVerifiedDoctors(){
  const isAdmin  = await  verifyAdmin();
    if(!isAdmin) throw new Error("unthauthorized")
    try{
        const verifiedDoctors = await db.user.findMany({
        where:{
            role:"DOCTOR",
            VerificationStatus:"VERIFIED",

        },
        orderBy:{
            createdAt:"asc"
        }

    })  

    return {doctors:verifiedDoctors};

   }
   catch(error){
    throw new Error("failed to fetch verified doctors")
   }


}
export async function updateDoctorStatus(formData){
   const isAdmin = await verifyAdmin();
   if(!isAdmin)
    throw new Error("unauthorized")
   
   const doctorId = formData.get("doctorId");
   const status = formData.get("status");

   if(!doctorId || !["VERIFIED" , "REJECTED"].includes(status)){
    throw new Error("Invalid  Input")
   }

   try{
    await db.user.update({
        where:{
            id:doctorId,
        },
        data:{
            VerificationStatus:status,
        },

    });
    revalidatePath("/admin")
    return {success:true}
   }
   catch(error){
    console.log("failed to update doctor status" , error)
    throw new Error(`failed to update doctor status :{error.message}`)

   }

}

export async function updateDoctorActiveStatus(formData){
    const isAdmin = await verifyAdmin();
    if(!isAdmin) throw new Error("unauthorized");

    const doctorId =  formData.get("doctorId");
    const suspend = formData.get("suspend")=== "true"

    if(!doctorId){
        throw new Error("doctor id is required")
    }
    try{
        const status = suspend ? "PENDING":"VERIFIED"
        await db.user.update({
            where:{
                id:doctorId,

            },
            data:{
                VerificationStatus:status,
            }, 
        })
        revalidatePath("/admin")
        return {success:true}


    }
    catch(error){
      throw new Error(`failed to update doctor status :${error.message}`);

    }
}









