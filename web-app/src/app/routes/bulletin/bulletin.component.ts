/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { HttpParams } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { TransferChange } from 'ng-zorro-antd/transfer';
import { NzFormatEmitEvent, NzTreeNode, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { finalize } from 'rxjs/operators';

import { BulletinDefine } from '../../pojo/BulletinDefine';
import { Monitor } from '../../pojo/Monitor';
import { AppDefineService } from '../../service/app-define.service';
import { BulletinDefineService } from '../../service/bulletin-define.service';
import { MonitorService } from '../../service/monitor.service';

@Component({
  selector: 'app-bulletin',
  templateUrl: './bulletin.component.html',
  styleUrls: ['./bulletin.component.less']
})
export class BulletinComponent implements OnInit {
  constructor(
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private appDefineSvc: AppDefineService,
    private monitorSvc: MonitorService,
    private bulletinDefineSvc: BulletinDefineService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}
  search!: string;
  tabDefines!: any[];
  tableLoading: boolean = true;
  bulletinNames: string[] = [];
  isAppListLoading = false;
  isMonitorListLoading = false;
  treeNodes!: NzTreeNodeOptions[];
  hierarchies: NzTreeNodeOptions[] = [];
  appMap = new Map<string, string>();
  appEntries: Array<{ value: any; key: string }> = [];
  checkedNodeList: NzTreeNode[] = [];
  monitors: Monitor[] = [];
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;

  ngOnInit(): void {
    this.loadData(this.pageIndex - 1, this.pageSize);
  }

  sync() {
    this.loadData(this.pageIndex - 1, this.pageSize);
  }

  onNewBulletinDefine() {
    this.define = new BulletinDefine();
    this.define.metrics = [];
    this.define.monitorIds = [];
    this.isManageModalAdd = true;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
  }

  deleteBulletinDefines(defineNames: string[]) {
    if (defineNames == null || defineNames.length == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.tableLoading = true;
    const deleteDefines$ = this.bulletinDefineSvc.deleteBulletinDefines(defineNames).subscribe(
      message => {
        deleteDefines$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadData(this.pageIndex - 1, this.pageSize);
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteDefines$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  define: BulletinDefine = new BulletinDefine();

  onManageModalCancel() {
    this.isManageModalVisible = false;
  }

  resetManageModalData() {
    this.isManageModalVisible = false;
  }

  onManageModalOk() {
    this.isManageModalOkLoading = true;
    if (this.isManageModalAdd) {
      const modalOk$ = this.bulletinDefineSvc
        .newBulletinDefine(this.define)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
              this.loadData(this.pageIndex - 1, this.pageSize);
              this.resetManageModalData();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.bulletinDefineSvc
        .editBulletinDefine(this.define)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
              this.loadData(this.pageIndex - 1, this.pageSize);
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
          }
        );
    }
  }

  onSearchAppDefines(): void {
    this.appDefineSvc
      .getAppDefines(this.i18nSvc.defaultLang)
      .pipe()
      .subscribe(
        message => {
          if (message.code === 0) {
            this.appMap = message.data;
            this.appEntries = Object.entries(this.appMap).map(([key, value]) => ({ key, value }));
            if (this.appEntries != null) {
              this.isAppListLoading = true;
            }
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  onSearchMonitorsByApp(app: string): void {
    this.monitorSvc
      .getMonitorsByApp(app)
      .pipe()
      .subscribe(
        message => {
          if (message.code === 0) {
            this.monitors = message.data;
            if (this.monitors != null) {
              this.isMonitorListLoading = true;
            }
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  onAppChange(app: string): void {
    if (app) {
      this.onSearchMonitorsByApp(app);
      this.onSearchTreeNodes(app);
    } else {
      this.hierarchies = [];
      this.treeNodes = [];
    }
  }

  onSearchTreeNodes(app: string): void {
    this.appDefineSvc
      .getAppHierarchyByName(this.i18nSvc.defaultLang, app)
      .pipe()
      .subscribe(
        message => {
          if (message.code === 0) {
            this.hierarchies = this.transformToTransferItems(message.data);
            this.treeNodes = this.generateTree(this.hierarchies);
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  transformToTransferItems(data: any[]): NzTreeNodeOptions[] {
    const result: NzTreeNodeOptions[] = [];
    let currentId = 1;

    const traverse = (nodes: any[], parentKey: string | null = null, parentId: number | null = null) => {
      nodes.forEach(node => {
        const key = parentKey ? `${parentKey}$$$${node.value}` : node.value;
        const isRootNode = parentId === null;
        const item: NzTreeNodeOptions = {
          id: currentId++,
          key,
          title: node.label,
          isLeaf: node.isLeaf,
          parentId,
          disabled: isRootNode
        };
        result.push(item);

        if (node.children) {
          traverse(node.children, key, item.id);
        }
      });
    };

    if (data[0] && data[0].children) {
      data = data[0].children;
      traverse(data);
    }

    return result;
  }

  private generateTree(arr: NzTreeNodeOptions[]): NzTreeNodeOptions[] {
    const tree: NzTreeNodeOptions[] = [];
    const mappedArr: any = {};
    let arrElem: NzTreeNodeOptions;
    let mappedElem: NzTreeNodeOptions;

    for (let i = 0, len = arr.length; i < len; i++) {
      arrElem = arr[i];
      mappedArr[arrElem.id] = { ...arrElem };
      mappedArr[arrElem.id].children = [];
    }

    for (const id in mappedArr) {
      if (mappedArr.hasOwnProperty(id)) {
        mappedElem = mappedArr[id];
        if (mappedElem.parentId) {
          mappedArr[mappedElem.parentId].children.push(mappedElem);
        } else {
          tree.push(mappedElem);
        }
      }
    }
    return tree;
  }

  treeCheckBoxChange(event: NzFormatEmitEvent, onItemSelect: (item: NzTreeNodeOptions) => void): void {
    this.checkBoxChange(event.node!, onItemSelect);
  }
  toggleSelectAll() {
    if (this.define.monitorIds.length === this.monitors.length) {
      this.define.monitorIds = [];
    } else {
      this.define.monitorIds = this.monitors.map(monitor => monitor.id);
    }
  }
  checkBoxChange(node: NzTreeNode, onItemSelect: (item: NzTreeNodeOptions) => void): void {
    if (node.isDisabled) {
      return;
    }

    if (node.isChecked) {
      this.checkedNodeList.push(node);
    } else {
      const idx = this.checkedNodeList.indexOf(node);
      if (idx !== -1) {
        this.checkedNodeList.splice(idx, 1);
      }
    }
    const item = this.hierarchies.find(w => w.id === node.origin.id);
    onItemSelect(item!);
  }

  transferChange(ret: TransferChange): void {
    const isDisabled = ret.to === 'right';
    this.checkedNodeList.forEach(node => {
      node.isDisabled = isDisabled;
      node.isChecked = isDisabled;
      this.define.metrics.push(node.key);
    });
  }

  loadData(page: number = 0, size: number = 10) {
    this.tableLoading = true;
    const metricData$ = this.bulletinDefineSvc.getMonitorMetricsData(page, size).subscribe(
      message => {
        metricData$.unsubscribe();
        if (message.code === 0 && message.data) {
          this.total = message.data.totalElements;
          this.updateTabDefines(message.data.content);
        } else if (message.code !== 0) {
          this.notifySvc.warning(`${message.msg}`, '');
          console.info(`${message.msg}`);
        }
      },
      error => {
        console.error(error.msg);
        metricData$.unsubscribe();
      }
    );
    this.tableLoading = false;
  }

  updateTabDefines(rawData: any[]) {
    const groupedData: any = {};
    rawData.forEach(item => {
      const name = item.name;
      if (!groupedData[name]) {
        groupedData[name] = {
          id: item.id,
          bulletinColumn: {},
          data: []
        };
      }

      let transformedItem: any = {
        app: item.app,
        monitorId: item.content.monitorId,
        host: item.content.host
      };

      item.content.metrics.forEach((metric: { name: string | number; fields: any }) => {
        if (!groupedData[name].bulletinColumn[metric.name]) {
          groupedData[name].bulletinColumn[metric.name] = new Set<string>();
        }
        metric.fields.forEach((field: any[]) => {
          field.forEach((fieldItem: any) => {
            const key = `${metric.name}$$$${fieldItem.key}`;
            const value = fieldItem.value;
            const unit = fieldItem.unit;

            if (!transformedItem[key]) {
              transformedItem[key] = [];
            }
            transformedItem[key].push(`${value}$$$${unit}`);

            groupedData[name].bulletinColumn[metric.name].add(key);
          });
        });
      });
      groupedData[name].data.push(transformedItem);
    });

    this.tabDefines = Object.keys(groupedData).map(name => ({
      name,
      id: groupedData[name].id,
      bulletinColumn: groupedData[name].bulletinColumn,
      data: groupedData[name].data
    }));
  }

  getMetricNames(bulletinTab: any): string[] {
    return Object.keys(bulletinTab.bulletinColumn);
  }

  getMaxRowSpan(data: { [x: string]: string | any[] }, bulletinTab: { bulletinColumn: { [x: string]: any } }) {
    let maxRowSpan = 1;
    for (let metricName of this.getMetricNames(bulletinTab)) {
      for (let field of bulletinTab.bulletinColumn[metricName]) {
        if (Array.isArray(data[field])) {
          maxRowSpan = Math.max(maxRowSpan, data[field].length);
        }
      }
    }
    return maxRowSpan;
  }

  onTablePageChange(params: NzTableQueryParams): void {
    const { pageSize, pageIndex } = params;

    // 只有当页码或每页条数变化时才获取数据
    console.log(pageIndex, pageSize, this.pageIndex, this.pageSize)
    if (pageIndex !== this.pageIndex || pageSize !== this.pageSize) {
      this.pageIndex = pageIndex;
      this.pageSize = pageSize;
      this.loadData(pageIndex - 1, pageSize);
    }
  }

  getRowIndexes(data: { [x: string]: string | any[] }, bulletinTab: { bulletinColumn: { [x: string]: any } }) {
    const maxRowSpan = this.getMaxRowSpan(data, bulletinTab);
    return Array.from({ length: maxRowSpan }, (_, index) => index);
  }

  isDeleteModalVisible: boolean = false;
  isDeleteModalOkLoading: boolean = false;

  onDeleteBulletinDefines() {
    this.isDeleteModalVisible = true;
  }
  onDeleteModalCancel() {
    this.isDeleteModalVisible = false;
  }

  onDeleteModalOk() {
    this.deleteBulletinDefines(this.bulletinNames);
    this.isDeleteModalOkLoading = false;
    this.isDeleteModalVisible = false;
  }

  protected readonly Array = Array;
}
