
// In the catch block of handleUpload method, modify the error handling
catch (error) {
  console.error("Error during avatar generation:", error);
  const errorMessage = error.details 
    ? `AI Processing Failed: ${JSON.stringify(error.details)}` 
    : (error.message || "There was an error generating your avatar");
  
  toast({
    title: "Generation limited",
    description: errorMessage,
    variant: "destructive",
  });
}
