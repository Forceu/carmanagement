﻿function showAddVehicleModal() {
    uploadedFile = "";
    $.get('/Vehicle/AddVehiclePartialView', function (data) {
        if (data) {
            $("#addVehicleModalContent").html(data);
            initTagSelector($("#inputTag"));
            $('#addVehicleModal').modal('show');
        }
    })
}
function hideAddVehicleModal() {
    $('#addVehicleModal').modal('hide');
}
//refreshable function to reload Garage PartialView
function loadGarage() {
    $.get('/Home/Garage', function (data) {
        $("#garageContainer").html(data);
        loadSettings();
        bindTabEvent();
    });
}
function loadSettings() {
    $.get('/Home/Settings', function (data) {
        $("#settings-tab-pane").html(data);
    });
}
function getVehicleSupplyRecords() {
    $.get(`/Vehicle/GetSupplyRecordsByVehicleId?vehicleId=0`, function (data) {
        if (data) {
            $("#supply-tab-pane").html(data);
            restoreScrollPosition();
        }
    });
}
function GetVehicleId() {
    return { vehicleId: 0 };
}
function bindTabEvent() {
    $('button[data-bs-toggle="tab"]').on('show.bs.tab', function (e) {
        switch (e.target.id) {
            case "supply-tab":
                getVehicleSupplyRecords();
                break;
            case "calendar-tab":
                getVehicleCalendarEvents();
                break;
        }
        switch (e.relatedTarget.id) { //clear out previous tabs with grids in them to help with performance
            case "supply-tab":
                $("#supply-tab-pane").html("");
                break;
            case "calendar-tab":
                $("#calendar-tab-pane").html("");
                break;
        }
    });
}
function getVehicleCalendarEvents() {
    $.get('/Home/Calendar', function (data) {
        if (data) {
            $("#calendar-tab-pane").html(data);
        }
    });
}
function showCalendarReminderModal(id) {
    event.stopPropagation();
    $.get(`/Home/ViewCalendarReminder?reminderId=${id}`, function (data) {
        if (data) {
            $("#reminderRecordCalendarModalContent").html(data);
            $("#reminderRecordCalendarModal").modal('show');
            $('#reminderRecordCalendarModal').off('shown.bs.modal').on('shown.bs.modal', function () {
                if (getGlobalConfig().useMarkDown) {
                    toggleMarkDownOverlay("reminderNotes");
                }
            });
        }
    })
}
function hideCalendarReminderModal() {
    $("#reminderRecordCalendarModal").modal('hide');
}
function generateReminderItem(id, urgency, description) {
    if (description.trim() == '') {
        return;
    }
    switch (urgency) {
        case "VeryUrgent":
            return `<p class="badge text-wrap bg-danger reminder-calendar-item mb-2" onclick='showCalendarReminderModal(${id})'>${encodeHTMLInput(description)}</p>`;
        case "PastDue":
            return `<p class="badge text-wrap bg-secondary reminder-calendar-item mb-2" onclick='showCalendarReminderModal(${id})'>${encodeHTMLInput(description)}</p>`;
        case "Urgent":
            return `<p class="badge text-wrap bg-warning reminder-calendar-item mb-2" onclick='showCalendarReminderModal(${id})'>${encodeHTMLInput(description)}</p>`;
        case "NotUrgent":
            return `<p class="badge text-wrap bg-success reminder-calendar-item mb-2" onclick='showCalendarReminderModal(${id})'>${encodeHTMLInput(description)}</p>`;
    }
}
function markDoneCalendarReminderRecord(reminderRecordId, e) {
    event.stopPropagation();
    $.post(`/Vehicle/PushbackRecurringReminderRecord?reminderRecordId=${reminderRecordId}`, function (data) {
        if (data) {
            hideCalendarReminderModal();
            successToast("Reminder Updated");
            getVehicleCalendarEvents();
        } else {
            errorToast(genericErrorMessage());
        }
    });
}
function deleteCalendarReminderRecord(reminderRecordId, e) {
    if (e != undefined) {
        event.stopPropagation();
    }
    $("#workAroundInput").show();
    Swal.fire({
        title: "Confirm Deletion?",
        text: "Deleted Reminders cannot be restored.",
        showCancelButton: true,
        confirmButtonText: "Delete",
        confirmButtonColor: "#dc3545"
    }).then((result) => {
        if (result.isConfirmed) {
            $.post(`/Vehicle/DeleteReminderRecordById?reminderRecordId=${reminderRecordId}`, function (data) {
                if (data) {
                    hideCalendarReminderModal();
                    successToast("Reminder Deleted");
                    getVehicleCalendarEvents();
                } else {
                    errorToast(genericErrorMessage());
                }
            });
        } else {
            $("#workAroundInput").hide();
        }
    });
}
function initCalendar() {
    if (groupedDates.length == 0) {
        //group dates
        eventDates.map(x => {
            var existingIndex = groupedDates.findIndex(y => y.date == x.date);
            if (existingIndex == -1) {
                groupedDates.push({ date: x.date, reminders: [`${generateReminderItem(x.id, x.urgency, x.description)}`] });
            } else if (existingIndex > -1) {
                groupedDates[existingIndex].reminders.push(`${generateReminderItem(x.id, x.urgency, x.description)}`);
            }
        });
    }
    $(".reminderCalendarViewContent").datepicker({
        startDate: "+0d",
        format: getShortDatePattern().pattern,
        todayHighlight: true,
        beforeShowDay: function (date) {
            var reminderDateIndex = groupedDates.findIndex(x => (x.date == date.getTime() || x.date == (date.getTime() - date.getTimezoneOffset() * 60000))); //take into account server timezone offset
            if (reminderDateIndex > -1) {
                return {
                    enabled: true,
                    classes: 'reminder-exist',
                    content: `<div class='text-wrap' style='height:20px;'><p>${date.getDate()}</p>${groupedDates[reminderDateIndex].reminders.join('<br>')}</div>`
                }
            }
        }
    });
}
function performLogOut() {
    $.post('/Login/LogOut', function (data) {
        if (data) {
            window.location.href = '/Login';
        }
    })
}
function loadPinnedNotes(vehicleId) {
    var hoveredGrid = $(`#gridVehicle_${vehicleId}`);
    if (hoveredGrid.attr("data-bs-title") == undefined) {
        $.get(`/Vehicle/GetPinnedNotesByVehicleId?vehicleId=${vehicleId}`, function (data) {
            if (data.length > 0) {
                //converted pinned notes to html.
                var htmlString = "<ul class='list-group list-group-flush'>";
                data.forEach(x => {
                    htmlString += `<li><b>${x.description}</b> : ${x.noteText}</li>`;
                });
                htmlString += "</ul>";
                hoveredGrid.attr("data-bs-title", htmlString);
                new bootstrap.Tooltip(hoveredGrid);
                hoveredGrid.tooltip("show");
            } else {
                //disable the tooltip
                hoveredGrid.attr("data-bs-title", "");
            }
        });
    } else {
        if (hoveredGrid.attr("data-bs-title") != '') {
            hoveredGrid.tooltip("show");
        }
    }
}
function hidePinnedNotes(vehicleId) {
    if ($(`#gridVehicle_${vehicleId}`).attr('data-bs-title') != '') {
        $(`#gridVehicle_${vehicleId}`).tooltip("hide");
    }
}

function filterGarage(sender, isSort) {
    var rowData = $(".garage-item");
    if (sender == undefined) {
        rowData.removeClass('override-hide');
        return;
    }
    var tagName = sender.textContent;
    if ($(sender).hasClass("bg-primary")) {
        if (!isSort) {
            rowData.removeClass('override-hide');
            $(sender).removeClass('bg-primary');
            $(sender).addClass('bg-secondary');
        } else {
            rowData.addClass('override-hide');
            $(`[data-tags~='${tagName}']`).removeClass('override-hide');
        }
    } else {
        //hide table rows.
        rowData.addClass('override-hide');
        $(`[data-tags~='${tagName}']`).removeClass('override-hide');
        if ($(".tagfilter.bg-primary").length > 0) {
            //disabling other filters
            $(".tagfilter.bg-primary").addClass('bg-secondary');
            $(".tagfilter.bg-primary").removeClass('bg-primary');
        }
        $(sender).addClass('bg-primary');
        $(sender).removeClass('bg-secondary');
    }
}
function sortVehicles(desc) {
    //get row data
    var rowData = $('.garage-item');
    var sortedRow = rowData.toArray().sort((a, b) => {
        var currentVal = globalParseFloat($(a).find(".garage-item-year").attr('data-unit'));
        var nextVal = globalParseFloat($(b).find(".garage-item-year").attr('data-unit'));
        if (desc) {
            return nextVal - currentVal;
        } else {
            return currentVal - nextVal;
        }
    });
    sortedRow.push($('.garage-item-add'))
    $('.vehiclesContainer').html(sortedRow);
}

var touchtimer;
var touchduration = 800;
function detectLongTouch(sender) {
    if ($(sender).hasClass("active")) {
        if (!touchtimer) {
            touchtimer = setTimeout(function () { sortGarage(sender, true); detectTouchEndPremature(sender); }, touchduration);
        }
    }
}
function detectTouchEndPremature(sender) {
    if (touchtimer) {
        clearTimeout(touchtimer);
        touchtimer = null;
    }
}

function sortGarage(sender, isMobile) {
    if (event != undefined) {
        event.preventDefault();
    }
    sender = $(sender);
    if (sender.hasClass("active")) {
        //do sorting only if garage is the active tab.
        var sortColumn = sender.text();
        var garageIcon = '<i class="bi bi-car-front me-2"></i>';
        var sortAscIcon = '<i class="bi bi-sort-numeric-down ms-2"></i>';
        var sortDescIcon = '<i class="bi bi-sort-numeric-down-alt ms-2"></i>';
        if (sender.hasClass('sort-asc')) {
            sender.removeClass('sort-asc');
            sender.addClass('sort-desc');
            sender.html(isMobile ? `<span class="ms-2 display-3">${garageIcon}${sortColumn}${sortDescIcon}</span>` : `${garageIcon}${sortColumn}${sortDescIcon}`);
            sortVehicles(true);
        } else if (sender.hasClass('sort-desc')) {
            //restore table
            sender.removeClass('sort-desc');
            sender.html(isMobile ? `<span class="ms-2 display-3">${garageIcon}${sortColumn}</span>` : `${garageIcon}${sortColumn}`);
            $('.vehiclesContainer').html(storedTableRowState);
            filterGarage($(".tagfilter.bg-primary").get(0), true);
        } else {
            //first time sorting.
            //check if table was sorted before by a different column(only relevant to fuel tab)
            if (storedTableRowState != null && ($(".sort-asc").length > 0 || $(".sort-desc").length > 0)) {
                //restore table state.
                $('.vehiclesContainer').html(storedTableRowState);
                //reset other sorted columns
                if ($(".sort-asc").length > 0) {
                    $(".sort-asc").html($(".sort-asc").html().replace(sortAscIcon, ""));
                    $(".sort-asc").removeClass("sort-asc");
                }
                if ($(".sort-desc").length > 0) {
                    $(".sort-desc").html($(".sort-desc").html().replace(sortDescIcon, ""));
                    $(".sort-desc").removeClass("sort-desc");
                }
            }
            sender.addClass('sort-asc');
            sender.html(isMobile ? `<span class="ms-2 display-3">${garageIcon}${sortColumn}${sortAscIcon}</span>` : `${garageIcon}${sortColumn}${sortAscIcon}`);
            storedTableRowState = null;
            storedTableRowState = $('.vehiclesContainer').html();
            sortVehicles(false);
        }
    }
}