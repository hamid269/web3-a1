const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = "https://camsiyfyhxxidyipwppo.supabase.co";
const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXNpeWZ5aHh4aWR5aXB3cHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk2MDYxMjcsImV4cCI6MjAyNTE4MjEyN30.LVZCfXoBD9-U_PcjiS8_W_dFgvGlf1fu8pJthJPZ-uU";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.get("/api/seasons", async(req, res) => {
    try {
        const { data, error } = await supabase
            .from("seasons")
            .select("year", { distinct: true })
            .order("year", { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error fetching seasons:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/api/circuits", async(req, res) => {
    try {
        const { data, error } = await supabase.from("circuits").select("*");
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error fetching circuits:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/api/circuits/:ref", async(req, res) => {
    try {
        const { ref } = req.params;
        const { data, error } = await supabase
            .from("circuits")
            .select("*")
            .eq("circuitRef", ref);
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error fetching circuit:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/api/circuits/season/:year", async(req, res) => {
    try {
        const { year } = req.params;
        // Retrieve the list of circuitIds for the given year from the races table.
        const { data: raceData, error: raceError } = await supabase
            .from("races")
            .select("circuitId")
            .eq("year", year);

        if (raceError) throw raceError;
        if (!raceData.length) {
            return res.status(404).json({ error: "No races found for this year" });
        }

        // Use the list of circuitIds to get the corresponding circuitRefs from the circuits table.
        const { data: circuitData, error: circuitError } = await supabase
            .from("circuits")
            .select("circuitRef")
            .in(
                "circuitId",
                raceData.map((race) => race.circuitId)
            );

        if (circuitError) throw circuitError;

        // Map through the circuitData to create an array of circuitRef values.
        const circuitRefs = circuitData.map((circuit) => circuit.circuitRef);

        if (!circuitRefs.length) {
            return res.status(404).json({ error: "No circuits found for this year" });
        }

        res.json(circuitRefs);
    } catch (error) {
        console.error("Error fetching circuits:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// Get all constructors
app.get("/api/constructors", async(req, res) => {
    try {
        const { data, error } = await supabase.from("constructors").select("*");
        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error fetching constructors:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/api/constructors/:ref", async(req, res) => {
    try {
        const { ref } = req.params;
        const { data, error } = await supabase
            .from("constructors")
            .select("*")
            .eq("constructorRef", ref);
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error fetching constructor:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// Get constructors for a given season
app.get("/api/constructors/season/:year", async(req, res) => {
    try {
        const { year } = req.params;

        // Query constructorIds for the given year from the races table
        const { data: raceData, error: raceError } = await supabase
            .from("races")
            .select("*")
            .eq("year", year);

        if (raceError) throw raceError;
        if (!raceData.length)
            return res.status(404).json({ error: "No races found for this year" });

        // Extract unique raceIds
        const raceIds = [...new Set(raceData.map((race) => race.raceId))];

        // Query qualifying data for the extracted raceIds
        const { data: qualifyingData, error: qualifyingError } = await supabase
            .from("qualifying")
            .select("*")
            .in("raceId", raceIds);

        if (qualifyingError) throw qualifyingError;

        // Extract unique constructorIds from qualifying data
        const constructorIds = [
            ...new Set(qualifyingData.map((qualifying) => qualifying.constructorId)),
        ];

        // Query constructor data with the extracted constructorIds
        const { data: constructorData, error: constructorError } = await supabase
            .from("constructors")
            .select("name", "constructorRef", "nationality", "constructorId")
            .in("constructorId", constructorIds);

        if (constructorError) throw constructorError;

        // Map through the constructorData to create the desired response format
        const result = constructorData.map((constructor) => {
            const races = raceData
                .filter((race) =>
                    qualifyingData.some(
                        (qualifying) =>
                        qualifying.raceId === race.raceId &&
                        qualifying.constructorId === constructor.constructorId
                    )
                )
                .map((race) => ({
                    name: race.name,
                    round: race.round,
                    year: race.year,
                    date: race.date,
                }));

            return {
                constructor,
            };
        });

        if (!result.length) {
            return res
                .status(404)
                .json({ error: "No constructors found for this year" });
        }
        res.json(result);
    } catch (error) {
        console.error("Error fetching constructors for season:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get all drivers
app.get("/api/drivers", async(req, res) => {
    try {
        // Query all drivers
        const { data, error } = await supabase.from("drivers").select("*");
        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error fetching drivers:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get driver by reference
app.get("/api/drivers/:ref", async(req, res) => {
    try {
        const { ref } = req.params;
        lowerRef = ref.toLowerCase();
        // Query driver by reference
        const { data, error } = await supabase
            .from("drivers")
            .select("*")
            .eq("driverRef", lowerRef);
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error fetching driver:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get drivers whose surname begins with the provided substring
app.get("/api/drivers/search/:substring", async(req, res) => {
    try {
        const { substring } = req.params;
        // Query drivers whose surname begins with the provided substring
        const { data, error } = await supabase
            .from("drivers")
            .select("*")
            .ilike("surname", `${substring}%`);
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error searching drivers:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get drivers within a given season
app.get("/api/drivers/season/:year", async(req, res) => {
    try {
        const { year } = req.params;

        // Query driverIds for the given year from the races table
        const { data: raceData, error: raceError } = await supabase
            .from("races")
            .select("*")
            .eq("year", year);

        if (raceError) throw raceError;
        if (!raceData.length)
            return res.status(404).json({ error: "No races found for this year" });

        // Extract unique raceIds
        const raceIds = [...new Set(raceData.map((race) => race.raceId))];

        // Query qualifying data for the extracted raceIds
        const { data: qualifyingData, error: qualifyingError } = await supabase
            .from("qualifying")
            .select("*")
            .in("raceId", raceIds);

        if (qualifyingError) throw qualifyingError;

        // Extract unique driverIds from qualifying data
        const driverIds = [
            ...new Set(qualifyingData.map((qualifying) => qualifying.driverId)),
        ];

        // Query driver data with the extracted driverIds
        const { data: driverData, error: driverError } = await supabase
            .from("drivers")
            .select("driverRef", "code", "forename", "surname", "driverId")
            .in("driverId", driverIds);

        if (driverError) throw driverError;

        // Map through the driverData to create the desired response format
        const result = driverData.map((driver) => {
            const races = raceData
                .filter((race) =>
                    qualifyingData.some(
                        (qualifying) =>
                        qualifying.raceId === race.raceId &&
                        qualifying.driverId === driver.driverId
                    )
                )
                .map((race) => ({
                    name: race.name,
                    round: race.round,
                    year: race.year,
                    date: race.date,
                }));

            return {
                driver,
            };
        });
        if (!result.length) {
            return res.status(404).json({ error: "No drivers found for this year" });
        }
        res.json(result);
    } catch (error) {
        console.error("Error fetching drivers for season:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get drivers within a given race
app.get("/api/drivers/race/:raceId", async(req, res) => {
    try {
        const { raceId } = req.params;

        // Query qualifying data for the given raceId
        const { data: qualifyingData, error: qualifyingError } = await supabase
            .from("qualifying")
            .select("*")
            .eq("raceId", raceId);

        if (qualifyingError) throw qualifyingError;

        if (!qualifyingData || qualifyingData.length === 0) {
            return res.status(404).json({ error: "No qualifying data found" });
        }
        // Extract unique driverIds from qualifying data
        const driverIds = [
            ...new Set(qualifyingData.map((qualifying) => qualifying.driverId)),
        ];

        // Query driver data with the extracted driverIds
        const { data: driverData, error: driverError } = await supabase
            .from("drivers")
            .select("driverRef", "code", "forename", "surname", "driverId")
            .in("driverId", driverIds);

        if (driverError) throw driverError;
        if (!driverData || driverData.length === 0) {
            return res.status(404).json({ error: "No results found" });
        }
        res.json(driverData);
    } catch (error) {
        console.error("Error fetching drivers for race:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get race by ID
app.get("/api/races/:raceId", async(req, res) => {
    try {
        const { raceId } = req.params;
        raceIdInt = parseInt(raceId);

        // Query race details for the given raceId
        const { data: raceData, error: raceError } = await supabase
            .from("races")
            .select("name, circuitId")
            .eq("raceId", raceIdInt);

        if (raceError) throw raceError;

        if (!raceData || raceData.length === 0) {
            return res.status(404).json({ error: "Race not found" });
        }

        const race = raceData[0];

        // Query circuit details using the circuitId from the race
        const { data: circuitData, error: circuitError } = await supabase
            .from("circuits")
            .select("name, location, country")
            .eq("circuitId", race.circuitId);

        if (circuitError) throw circuitError;

        if (!circuitData || circuitData.length === 0) {
            return res.status(404).json({ error: "Circuit details not found" });
        }

        const circuit = circuitData[0];

        // Combine race and circuit details
        const result = {
            name: race.name,
            circuit: {
                name: circuit.name,
                location: circuit.location,
                country: circuit.country,
            },
        };

        res.json(result);
    } catch (error) {
        console.error("Error fetching race:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get races within a given season ordered by round
app.get("/api/races/season/:year", async(req, res) => {
    try {
        const { year } = req.params;
        // Query races for the given season ordered by round
        const { data, error } = await supabase
            .from("races")
            .select("*")
            .eq("year", year)
            .order("round");
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error fetching races for season:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// Get specific race within a given season specified by round number
app.get("/api/races/season/:year/:round", async(req, res) => {
    try {
        const { year, round } = req.params;
        // Query specific race within a given season specified by round number
        const { data, error } = await supabase
            .from("races")
            .select("*")
            .eq("year", year)
            .eq("round", round);
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error fetching race:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// Returns all the races for a given circuit ordered by year
app.get("/api/races/circuits/:ref", async(req, res) => {
    try {
        const { ref } = req.params;

        // Query circuitId using the circuitRef
        const { data: circuitData, error: circuitError } = await supabase
            .from("circuits")
            .select("circuitId")
            .eq("circuitRef", ref);

        if (circuitError) throw circuitError;
        if (!circuitData || circuitData.length === 0) {
            return res.status(404).json({ error: "Circuit not found" });
        }

        const circuitId = circuitData[0].circuitId;

        // Query races for the given circuitId, ordered by year
        const { data: racesData, error: racesError } = await supabase
            .from("races")
            .select("*")
            .eq("circuitId", circuitId)
            .order("year", { ascending: true });

        if (racesError) throw racesError;
        if (!racesData || racesData.length === 0) {
            return res.status(404).json({ error: "No races found for this circuit" });
        }

        res.json(racesData);
    } catch (error) {
        console.error("Error fetching races for circuit:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Returns all the races for a given circuit between two years
app.get("/api/races/circuits/:ref/season/:start/:end", async(req, res) => {
    try {
        const { ref, start, end } = req.params;

        // Query circuitId using the circuitRef
        const { data: circuitData, error: circuitError } = await supabase
            .from("circuits")
            .select("circuitId")
            .eq("circuitRef", ref);

        if (circuitError) throw circuitError;
        if (!circuitData || circuitData.length === 0) {
            return res.status(404).json({ error: "Circuit not found" });
        }

        const circuitId = circuitData[0].circuitId;

        // Query races for the given circuitId and years, ordered by year
        const { data: racesData, error: racesError } = await supabase
            .from("races")
            .select("*")
            .eq("circuitId", circuitId)
            .gte("year", start)
            .lte("year", end)
            .order("year", { ascending: true });

        if (racesError) throw racesError;
        if (!racesData || racesData.length === 0) {
            return res.status(404).json({
                error: "No races found for this circuit between the provided years",
            });
        }

        res.json(racesData);
    } catch (error) {
        console.error(
            "Error fetching races for circuit between years:",
            error.message
        );
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Returns the results for the specified race
app.get("/api/results/:raceId", async(req, res) => {
    try {
        const { raceId } = req.params;

        // Check if raceId is provided and is a valid number
        if (!raceId || isNaN(parseInt(raceId))) {
            return res.status(400).json({ error: "Invalid raceId" });
        }

        // Query results for the specified race
        const { data: resultsData, error: resultsError } = await supabase
            .from("results")
            .select("grid, positionText, driverId, constructorId")
            .eq("raceId", raceId)
            .order("grid");

        if (resultsError) throw resultsError;
        if (!resultsData || resultsData.length === 0) {
            return res
                .status(404)
                .json({ error: "Results not found for the specified race" });
        }

        // Extract unique driverIds and constructorIds
        const driverIds = [
            ...new Set(resultsData.map((result) => result.driverId)),
        ];
        const constructorIds = [
            ...new Set(resultsData.map((result) => result.constructorId)),
        ];

        // Query drivers and constructors for the selected results
        const { data: driversData, error: driversError } = await supabase
            .from("drivers")
            .select("driverRef, code, forename, surname, driverId")
            .in("driverId", driverIds);

        const { data: constructorsData, error: constructorsError } = await supabase
            .from("constructors")
            .select("name, constructorRef, nationality, constructorId")
            .in("constructorId", constructorIds);

        if (driversError) throw driversError;
        if (constructorsError) throw constructorsError;

        if (!driversData || driversData.length === 0) {
            return res.status(404).json({ error: "Drivers not found" });
        }

        if (!constructorsData || constructorsData.length === 0) {
            return res.status(404).json({ error: "Constructors not found" });
        }

        // Create a map of drivers and constructors for efficient lookup
        const driversMap = {};
        driversData.forEach((driver) => {
            driversMap[driver.driverId] = driver;
        });

        const constructorsMap = {};
        constructorsData.forEach((constructor) => {
            constructorsMap[constructor.constructorId] = constructor;
        });

        // Merge results with driver and constructor details
        const formattedResults = resultsData.map((result) => ({
            grid: result.grid,
            positionText: result.positionText,
            driver: driversMap[result.driverId],
            constructor: constructorsMap[result.constructorId],
        }));

        res.json(formattedResults);
    } catch (error) {
        console.error("Error fetching race results:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Returns all the results for a given driver
app.get("/api/results/driver/:ref", async(req, res) => {
    try {
        const { ref } = req.params;

        // Query the driverId for the given driver reference
        const { data: driverData, error: driverError } = await supabase
            .from("drivers")
            .select("driverId")
            .eq("driverRef", ref)
            .single();

        if (driverError) throw driverError;
        if (!driverData)
            return res.status(404).json({ error: "Driver not found" });

        // Query results for the retrieved driverId
        const { data: resultsData, error: resultsError } = await supabase
            .from("results")
            .select("*")
            .eq("driverId", driverData.driverId);

        if (resultsError) throw resultsError;
        if (!resultsData.length)
            return res.status(404).json({ error: "No results found for this driver" });

        res.json(resultsData);
    } catch (error) {
        console.error("Error fetching results for driver:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Returns all the results for a given driver between two years
app.get(
    "/api/results/drivers/:driverRef/seasons/:startYear/:endYear",
    async(req, res) => {
        try {
            const { driverRef, startYear, endYear } = req.params;

            // Query the drivers table to get the driverId for the specified driver reference
            const { data: driverData, error: driverError } = await supabase
                .from("drivers")
                .select("driverId")
                .eq("driverRef", driverRef)
                .single();

            if (driverError) throw driverError;
            if (!driverData) {
                return res.status(404).json({ error: "Driver not found" });
            }

            const driverId = driverData.driverId;

            // Query the races table to get the raceIds for the specified range of years
            const { data: racesData, error: racesError } = await supabase
                .from("races")
                .select("raceId")
                .gte("year", startYear)
                .lte("year", endYear);

            if (racesError) throw racesError;
            if (!racesData || racesData.length === 0) {
                return res.status(404).json({ error: "No results found" });
            }

            const raceIds = racesData.map((race) => race.raceId);

            // Query the results table to get all results for the specified driverId and raceIds
            const { data: resultsData, error: resultsError } = await supabase
                .from("results")
                .select("*")
                .eq("driverId", driverId)
                .in("raceId", raceIds);

            if (resultsError) throw resultsError;
            if (!resultsData || resultsData.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Results not found for the driver" });
            }
            // Extract unique constructorIds from the results data
            const constructorIds = [
                ...new Set(resultsData.map((result) => result.constructorId)),
            ];

            // Query the constructors table to get additional information
            const { data: constructorsData, error: constructorsError } =
            await supabase
                .from("constructors")
                .select("name", "constructorRef", "nationality")
                .in("constructorId", constructorIds);

            if (constructorsError) throw constructorsError;
            if (!constructorsData || constructorsData.length === 0) {
                return res.status(404).json({ error: "Constructors not found" });
            }

            // Create a map of constructors for efficient lookup
            const constructorsMap = {};
            constructorsData.forEach((constructor) => {
                constructorsMap[constructor.constructorId] = constructor;
            });

            // Format the results with race and constructor details
            const formattedResults = resultsData.map((result) => ({
                grid: result.grid,
                positionText: result.positionText,
                raceId: result.raceId,
                constructor: constructorsMap[result.constructorId],
            }));

            res.json(formattedResults);
        } catch (error) {
            console.error("Error fetching results for driver:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
);

// Returns the qualifying results for the specified race
app.get("/api/qualifying/:raceId", async(req, res) => {
    try {
        const { raceId } = req.params;

        // Query qualifying results for the given raceId and sort by position in ascending order
        const { data: qualifyingData, error: qualifyingError } = await supabase
            .from("qualifying")
            .select("*")
            .eq("raceId", raceId)
            .order("position", { ascending: true });

        if (qualifyingError) throw qualifyingError;
        if (!qualifyingData.length)
            return res.status(404).json({ error: "No qualifying results found for this race" });

        res.json(qualifyingData);
    } catch (error) {
        console.error("Error fetching qualifying results:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Returns the current season driver standings table for the specified race
app.get("/api/standings/drivers/:raceId", async(req, res) => {
    try {
        const { raceId } = req.params;
        // Query current season driver standings for the specified race
        const { data, error } = await supabase
            .from("driver_standings")
            .select("*")
            .eq("raceId", raceId)
            .order("position", { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }

        driverList = [];
        for (const d of data) {
            try {
                const { data: driverData, error: driverError } = await supabase
                    .from("drivers")
                    .select("driverRef, code, forename, surname, driverId")
                    .eq("driverId", d.driverId);

                if (driverError) throw driverError;
                driverList.push(driverData);
            } catch (error) {
                console.error("Error fetching driver data:", error.message);
            }
        }

        driverMap = {};
        driverList.forEach((driver) => {
            driverMap[driver[0].driverId] = driver[0];
        });

        const formattedResults = data.map((result) => ({
            position: result.position,
            positionText: result.positionText,
            points: result.points,
            wins: result.wins,
            driver: driverMap[result.driverId],
        }));

        res.json(formattedResults);
    } catch (error) {
        console.error("Error fetching driver standings:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Returns the current season constructors standings table for the specified race
app.get("/api/standings/constructors/:raceId", async(req, res) => {
    try {
        const { raceId } = req.params;
        if (!raceId || isNaN(parseInt(raceId))) {
            return res.status(400).json({ error: "Invalid raceId" });
        }
        // Query current season constructors standings for the specified race
        const { data, error } = await supabase
            .from("constructor_standings")
            .select("*")
            .eq("raceId", raceId)
            .order("position", { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No result found" });
        }

        constructorList = [];
        for (const c of data) {
            try {
                const { data: constructorData, error: constructorError } =
                await supabase
                    .from("constructors")
                    .select("name, constructorRef, nationality, constructorId")
                    .eq("constructorId", c.constructorId);
                if (constructorError) throw constructorError;
                constructorList.push(constructorData);
            } catch (error) {
                console.error("Error fetching constructor data:", error.message);
            }
        }

        if (constructorList.length === 0) {
            return res.status(404).json({ error: "No results found" });
        }

        constructorMap = {};
        constructorList.forEach((constructor) => {
            constructorMap[constructor[0].constructorId] = constructor[0];
        });

        const formattedResults = data.map((result) => ({
            position: result.position,
            positionText: result.positionText,
            points: result.points,
            wins: result.wins,
            raceId: result.raceId,
            constructorStandingsId: result.constructorStandingsId,
            constructor: constructorMap[result.constructorId],
        }));

        res.json(formattedResults);
    } catch (error) {
        console.error("Error fetching constructor standings:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});